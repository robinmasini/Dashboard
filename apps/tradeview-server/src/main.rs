use rust_decimal::Decimal;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, Mutex};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;
use tradeview_api::{create_router, AppState, ClientWsCommand};
use tradeview_candle_engine::CandleEngine;
use tradeview_domain::{InstrumentId, MarketEvent, OrderSide, OrderType};
use tradeview_event_store::LocalEventStore;
use tradeview_execution_sim::{ExecutionEngineEvent, SimExecutionEngine};
use tradeview_market_data::SyntheticMarketGenerator;
use tradeview_oms::PlaceOrderCommand;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting TradeView Real Execution Server v0.1.0...");

    let (event_tx, mut event_rx) = mpsc::channel::<MarketEvent>(1000);
    let (cmd_tx, mut cmd_rx) = mpsc::channel::<ClientWsCommand>(100);
    let (broadcast_tx, _) = broadcast::channel::<String>(1000);

    let event_store = Arc::new(LocalEventStore::new("session-nvda-01", "NVDA"));
    let candle_engine = Arc::new(Mutex::new(CandleEngine::new()));
    let sim_engine = Arc::new(Mutex::new(SimExecutionEngine::new(
        "demo-paper-100k",
        Decimal::from(100_000),
    )));

    // Start synthetic market generator for NVDA
    let generator = SyntheticMarketGenerator::new("NVDA");
    generator.start(event_tx);

    let b_tx = broadcast_tx.clone();
    let store = event_store.clone();
    let engine = candle_engine.clone();
    let execution_engine = sim_engine.clone();

    // Spawn event processor loop (ticks, quotes, candles, tick-by-tick PnL updates)
    tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            store.record(event.clone()).await;

            // Broadcast raw market event
            if let Ok(json_str) = serde_json::to_string(&event) {
                let _ = b_tx.send(json_str);
            }

            let mut exec_guard = execution_engine.lock().await;
            let mut engine_events = Vec::new();

            match event {
                MarketEvent::Quote(ref quote) => {
                    engine_events = exec_guard.on_quote(quote);
                }
                MarketEvent::Tick(ref tick) => {
                    engine_events = exec_guard.on_tick(tick);

                    // Process tick into candle engine
                    let mut engine_guard = engine.lock().await;
                    let candles = engine_guard.process_tick(tick);

                    for candle in candles {
                        let candle_event = MarketEvent::Candle(candle);
                        if let Ok(c_json) = serde_json::to_string(&candle_event) {
                            let _ = b_tx.send(c_json);
                        }
                    }
                }
                _ => {}
            }

            // Broadcast execution engine updates (Account, Positions, Orders, Executions)
            for ee in engine_events {
                if let Ok(ee_json) = serde_json::to_string(&ee) {
                    let _ = b_tx.send(ee_json);
                }
            }
        }
    });

    let b_tx_cmd = broadcast_tx.clone();
    let execution_engine_cmd = sim_engine.clone();

    // Spawn client command loop (WS PlaceOrder, ClosePosition, ResetAccount)
    tokio::spawn(async move {
        while let Some(cmd) = cmd_rx.recv().await {
            let mut exec_guard = execution_engine_cmd.lock().await;
            let mut engine_events = Vec::new();

            match cmd {
                ClientWsCommand::PlaceOrder(place_cmd) => {
                    info!("Received PlaceOrder command: {:?}", place_cmd);
                    engine_events = exec_guard.submit_order(place_cmd);
                }
                ClientWsCommand::ClosePosition { symbol } => {
                    info!("Received ClosePosition command for symbol: {}", symbol);
                    let open_positions = exec_guard.open_positions();
                    for pos in open_positions {
                        if pos.instrument.0 == symbol.to_uppercase() {
                            let close_side = match pos.side {
                                OrderSide::BUY => OrderSide::SELL,
                                OrderSide::SELL => OrderSide::BUY,
                            };
                            let close_cmd = PlaceOrderCommand {
                                client_order_id: Uuid::new_v4().to_string(),
                                instrument: InstrumentId::new(&symbol),
                                side: close_side,
                                order_type: OrderType::MARKET,
                                price: None,
                                quantity: pos.quantity,
                            };
                            engine_events.extend(exec_guard.submit_order(close_cmd));
                        }
                    }
                }
                ClientWsCommand::ResetAccount => {
                    info!("Received ResetAccount command");
                    engine_events = exec_guard.reset();
                }
            }

            for ee in engine_events {
                if let Ok(ee_json) = serde_json::to_string(&ee) {
                    let _ = b_tx_cmd.send(ee_json);
                }
            }
        }
    });

    let app_state = AppState {
        tx: broadcast_tx,
        cmd_tx,
    };
    let app = create_router(app_state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    info!("TradeView Real Execution Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
