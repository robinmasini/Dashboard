use rust_decimal::Decimal;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, Mutex};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;
use tradeview_api::{create_router, AppState, ClientWsCommand};
use tradeview_candle_engine::CandleEngine;
use tradeview_clock::{SystemClock, TradingClock};
use tradeview_domain::{
    AccountId, ClientOrderId, InstrumentId, MarketEvent, Money, OrderType, PlaceOrderCommand,
};
use tradeview_event_store::LocalEventStore;
use tradeview_execution_sim::SimExecutionEngine;
use tradeview_market_data::SyntheticMarketGenerator;

const SYMBOL: &str = "NVDA";
const MARKET_DATA_SEED: u64 = 42;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting TradeView engine (SIM mode)");

    let clock: Arc<dyn TradingClock> = Arc::new(SystemClock::new());
    let instrument = InstrumentId::new(SYMBOL);

    let (event_tx, mut event_rx) = mpsc::channel::<MarketEvent>(1000);
    let (cmd_tx, mut cmd_rx) = mpsc::channel::<ClientWsCommand>(100);
    let (broadcast_tx, _) = broadcast::channel::<String>(1000);

    let event_store = Arc::new(LocalEventStore::new(
        "session-nvda-01",
        instrument,
        clock.clone(),
    ));
    let candle_engine = Arc::new(Mutex::new(CandleEngine::new()));
    let sim_engine = Arc::new(Mutex::new(SimExecutionEngine::new(
        AccountId::new("demo-paper-100k"),
        Money::new(Decimal::from(100_000)),
        clock.clone(),
    )));

    SyntheticMarketGenerator::new(SYMBOL, MARKET_DATA_SEED, clock.clone()).spawn(event_tx);

    let market_broadcast = broadcast_tx.clone();
    let store = event_store.clone();
    let candles = candle_engine.clone();
    let market_execution = sim_engine.clone();

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
                    for candle in produced {
                        if let Ok(json) = serde_json::to_string(&MarketEvent::Candle(candle)) {
                            let _ = market_broadcast.send(json);
                        }
                    }
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
