use rust_decimal::Decimal;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, Mutex};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;
use tradeview_api::{create_router, AppState, ClientWsCommand};
use tradeview_broker_core::MarketDataProvider;
use tradeview_broker_ibkr::{IbkrConfig, IbkrMarketData};
use tradeview_candle_engine::CandleEngine;
use tradeview_clock::{SystemClock, TradingClock};
use tradeview_domain::{
    AccountId, ClientOrderId, InstrumentId, MarketDataMode, MarketEvent, MarketStatus, Money,
    OrderType, PlaceOrderCommand, Timeframe,
};
use tradeview_event_store::LocalEventStore;
use tradeview_execution_sim::SimExecutionEngine;
use tradeview_indicators::{IndicatorEvent, IndicatorWindow};
use tradeview_market_data::{InstrumentProfile, SyntheticMarketGenerator};

/// Micro E-mini S&P 500 and Micro E-mini Nasdaq-100.
const DEFAULT_SYMBOLS: &str = "MES,MNQ";
const MARKET_DATA_SEED: u64 = 42;

/// Timeframe the chart draws, and therefore the one the analytics describe.
/// S15 by default: on M5 a session shows a single bar for its first five
/// minutes, leaving nothing to analyse.
const DEFAULT_INDICATOR_TIMEFRAME: Timeframe = Timeframe::S15;

fn indicator_timeframe() -> Timeframe {
    match std::env::var("TRADEVIEW_INDICATOR_TIMEFRAME")
        .unwrap_or_default()
        .to_uppercase()
        .as_str()
    {
        "S1" => Timeframe::S1,
        "S5" => Timeframe::S5,
        "S15" => Timeframe::S15,
        "M1" => Timeframe::M1,
        "M5" => Timeframe::M5,
        _ => DEFAULT_INDICATOR_TIMEFRAME,
    }
}
/// Bars retained for the block and step analysis.
const INDICATOR_WINDOW: usize = 240;
/// Grid density; 1 is the coarsest, matching the reference layout.
const INDICATOR_DENSITY: u32 = 1;

/// Where prices come from. Selecting this wrongly is the difference between a
/// demonstration and a trading screen, so it is explicit rather than inferred.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MarketSource {
    Synthetic,
    Ibkr,
}

fn market_source() -> MarketSource {
    match std::env::var("TRADEVIEW_MARKET_SOURCE")
        .unwrap_or_default()
        .to_uppercase()
        .as_str()
    {
        "IBKR" => MarketSource::Ibkr,
        _ => MarketSource::Synthetic,
    }
}

fn symbols() -> Vec<String> {
    std::env::var("TRADEVIEW_SYMBOLS")
        .unwrap_or_else(|_| DEFAULT_SYMBOLS.to_string())
        .split(',')
        .map(|part| part.trim().to_uppercase())
        .filter(|part| !part.is_empty())
        .collect()
}

/// Starting capital of the SIM account, overridable with TRADEVIEW_INITIAL_CAPITAL.
const DEFAULT_INITIAL_CAPITAL: i64 = 39_000;

/// Reads the starting capital from the environment, refusing a value that would
/// make the account meaningless rather than silently falling back.
fn initial_capital() -> Result<Money, String> {
    let raw = match std::env::var("TRADEVIEW_INITIAL_CAPITAL") {
        Ok(value) => value,
        Err(_) => return Ok(Money::new(Decimal::from(DEFAULT_INITIAL_CAPITAL))),
    };

    let parsed: Decimal = raw
        .trim()
        .parse()
        .map_err(|_| format!("TRADEVIEW_INITIAL_CAPITAL is not a number: {raw:?}"))?;

    if parsed <= Decimal::ZERO {
        return Err(format!(
            "TRADEVIEW_INITIAL_CAPITAL must be positive, got {parsed}"
        ));
    }
    Ok(Money::new(parsed))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting TradeView engine (SIM mode)");

    let clock: Arc<dyn TradingClock> = Arc::new(SystemClock::new());
    let symbols = symbols();
    if symbols.is_empty() {
        return Err("TRADEVIEW_SYMBOLS resolved to no instrument".into());
    }
    info!(?symbols, "instruments under simulation");

    let (event_tx, mut event_rx) = mpsc::channel::<MarketEvent>(1000);
    let (cmd_tx, mut cmd_rx) = mpsc::channel::<ClientWsCommand>(100);
    let (broadcast_tx, _) = broadcast::channel::<String>(1000);

    let event_store = Arc::new(LocalEventStore::new(
        &format!("session-{}", symbols.join("-").to_lowercase()),
        InstrumentId::new(&symbols[0]),
        clock.clone(),
    ));
    let candle_engine = Arc::new(Mutex::new(CandleEngine::new()));
    let analysis_timeframe = indicator_timeframe();
    info!(timeframe = ?analysis_timeframe, "indicator timeframe");

    // One analysis window per instrument: blocks and steps describe a single
    // series, and merging two would invent structure that exists in neither.
    let indicator_windows: Arc<Mutex<HashMap<InstrumentId, IndicatorWindow>>> =
        Arc::new(Mutex::new(
            symbols
                .iter()
                .map(|symbol| {
                    (
                        InstrumentId::new(symbol),
                        IndicatorWindow::new(
                            analysis_timeframe,
                            INDICATOR_WINDOW,
                            INDICATOR_DENSITY,
                        ),
                    )
                })
                .collect(),
        ));
    let starting_capital = initial_capital()?;
    info!(capital = %starting_capital, "SIM account funded");
    let sim_engine = Arc::new(Mutex::new(SimExecutionEngine::new(
        AccountId::new("sim-account"),
        starting_capital,
        clock.clone(),
    )));

    // The market starts halted: arriving on the screen should not silently set
    // a feed running, and a running feed means fills.
    let feed_running = Arc::new(AtomicBool::new(false));

    match market_source() {
        MarketSource::Synthetic => {
            info!("market source: SYNTHETIC — invented prices, unrelated to any exchange");
            for (offset, symbol) in symbols.iter().enumerate() {
                let profile = InstrumentProfile::for_symbol(symbol).unwrap_or_default();
                // A distinct seed per instrument, still derived from the session
                // seed: sharing one would make both indices move in lockstep.
                let seed = MARKET_DATA_SEED.wrapping_add(offset as u64 * 1_000);
                SyntheticMarketGenerator::with_profile(symbol, seed, profile, clock.clone())
                    .spawn_gated(event_tx.clone(), feed_running.clone());
            }
        }
        MarketSource::Ibkr => {
            let config = IbkrConfig::from_env().map_err(|error| error.to_string())?;
            info!(
                address = %config.address(),
                endpoint = %config
                    .endpoint()
                    .map(|e| e.to_string())
                    .unwrap_or_else(|| "unknown port".into()),
                "market source: INTERACTIVE BROKERS"
            );

            let provider = IbkrMarketData::new(config, clock.clone());
            let instruments: Vec<InstrumentId> =
                symbols.iter().map(|s| InstrumentId::new(s)).collect();

            // Failing here is fatal on purpose: falling back to synthetic prices
            // would silently hand the operator invented data on a screen they
            // believe is live.
            let mut feed = provider
                .subscribe(&instruments)
                .await
                .map_err(|error| error.to_string())?;

            let forward_tx = event_tx.clone();
            let forward_running = feed_running.clone();
            tokio::spawn(async move {
                while let Some(event) = feed.recv().await {
                    // Gating the forwarder, not the socket: the engine only ever
                    // acts on what reaches it, so a halted market cannot fill.
                    if !forward_running.load(Ordering::Relaxed) {
                        continue;
                    }
                    if forward_tx.send(event).await.is_err() {
                        break;
                    }
                }
            });
        }
    }

    drop(event_tx);
    info!("market feed halted — waiting for the operator to start it");

    let market_broadcast = broadcast_tx.clone();
    let store = event_store.clone();
    let candles = candle_engine.clone();
    let market_execution = sim_engine.clone();
    let indicators = indicator_windows.clone();

    tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            store.record(event.clone()).await;

            if let Ok(json) = serde_json::to_string(&event) {
                let _ = market_broadcast.send(json);
            }

            let mut execution = market_execution.lock().await;
            let engine_events = match &event {
                MarketEvent::Quote(quote) => execution.on_quote(quote),
                MarketEvent::Tick(tick) => {
                    let produced = candles.lock().await.process_tick(tick);
                    let mut windows = indicators.lock().await;
                    let mut analytics_changed = false;

                    for candle in produced {
                        if let Some(window) = windows.get_mut(&candle.instrument) {
                            analytics_changed |= window.accept(&candle);
                        }
                        if let Ok(json) = serde_json::to_string(&MarketEvent::Candle(candle)) {
                            let _ = market_broadcast.send(json);
                        }
                    }

                    // Recomputed only when the analysed timeframe moved, rather
                    // than on every tick: the whole window is walked each time.
                    if analytics_changed {
                        if let Some(window) = windows.get(&tick.instrument) {
                            let snapshot = window.analyse(&tick.instrument);
                            if let Ok(json) =
                                serde_json::to_string(&IndicatorEvent::Indicators(snapshot))
                            {
                                let _ = market_broadcast.send(json);
                            }
                        }
                    }
                    drop(windows);

                    execution.on_tick(tick)
                }
                _ => Vec::new(),
            };

            for engine_event in engine_events {
                if let Ok(json) = serde_json::to_string(&engine_event) {
                    let _ = market_broadcast.send(json);
                }
            }
        }
    });

    let command_broadcast = broadcast_tx.clone();
    let command_execution = sim_engine.clone();
    let order_counter = AtomicU64::new(0);
    let command_feed = feed_running.clone();
    let feed_symbols: Vec<InstrumentId> = symbols.iter().map(|s| InstrumentId::new(s)).collect();
    let feed_clock = clock.clone();

    tokio::spawn(async move {
        while let Some(command) = cmd_rx.recv().await {
            let mut execution = command_execution.lock().await;

            let engine_events = match command {
                ClientWsCommand::PlaceOrder(order) => {
                    info!(?order, "place order");
                    execution.submit_order(order)
                }
                ClientWsCommand::ClosePosition { symbol } => {
                    info!(%symbol, "close position");
                    let to_close: Vec<_> = execution
                        .open_positions()
                        .into_iter()
                        .filter(|position| position.instrument == symbol)
                        .collect();

                    let mut events = Vec::new();
                    for position in to_close {
                        let id = order_counter.fetch_add(1, Ordering::SeqCst);
                        events.extend(execution.submit_order(PlaceOrderCommand {
                            client_order_id: ClientOrderId::new(format!("CLOSE-{id}")),
                            instrument: position.instrument,
                            side: position.side.opposite(),
                            order_type: OrderType::Market,
                            price: None,
                            quantity: position.quantity,
                        }));
                    }
                    events
                }
                ClientWsCommand::ResetAccount => {
                    info!("reset account");
                    execution.reset()
                }
                ClientWsCommand::SetMarketFeed { running } => {
                    info!(running, "market feed");
                    command_feed.store(running, Ordering::Relaxed);

                    // Echo the state so the button reflects the engine rather
                    // than what the client hoped for.
                    for instrument in &feed_symbols {
                        let status = MarketEvent::Status(MarketStatus {
                            mode: MarketDataMode::Synthetic,
                            active_symbol: instrument.clone(),
                            connected: true,
                            feed_running: running,
                            events_received: 0,
                            events_lost: 0,
                            estimated_delay_ms: 0,
                            last_timestamp: feed_clock.now(),
                        });
                        if let Ok(json) = serde_json::to_string(&status) {
                            let _ = command_broadcast.send(json);
                        }
                    }
                    Vec::new()
                }
            };

            for engine_event in engine_events {
                if let Ok(json) = serde_json::to_string(&engine_event) {
                    let _ = command_broadcast.send(json);
                }
            }
        }
    });

    let app = create_router(AppState {
        tx: broadcast_tx,
        cmd_tx,
    });

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    info!("listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
