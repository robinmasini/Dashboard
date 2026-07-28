use chrono::Utc;
use rand::Rng;
use rust_decimal::Decimal;
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use tradeview_domain::{
    InstrumentId, MarketDataMode, MarketEvent, MarketStatus, OrderSide, Quote, TradeTick,
};

pub struct SyntheticMarketGenerator {
    symbol: InstrumentId,
    sequence: Arc<AtomicU64>,
}

impl SyntheticMarketGenerator {
    pub fn new(symbol: &str) -> Self {
        Self {
            symbol: InstrumentId::new(symbol),
            sequence: Arc::new(AtomicU64::new(1)),
        }
    }

    pub fn start(&self, tx: mpsc::Sender<MarketEvent>) -> tokio::task::JoinHandle<()> {
        let symbol = self.symbol.clone();
        let sequence = self.sequence.clone();

        tokio::spawn(async move {
            let mut current_price = Decimal::from_str("211.75").unwrap();
            let mut total_events: u64 = 0;

            loop {
                // Generate tick micro fluctuation (-0.35 to +0.35)
                let delta_cents: f64 = rand::thread_rng().gen_range(-0.35..0.36);
                let delta = Decimal::from_str(&format!("{:.2}", delta_cents)).unwrap_or(Decimal::ZERO);

                current_price += delta;
                if current_price < Decimal::from_str("150.00").unwrap() {
                    current_price = Decimal::from_str("200.00").unwrap();
                }

                let seq = sequence.fetch_add(1, Ordering::SeqCst);
                total_events += 1;
                let now = Utc::now();

                let side = if delta >= Decimal::ZERO {
                    OrderSide::BUY
                } else {
                    OrderSide::SELL
                };

                let qty_val: u64 = rand::thread_rng().gen_range(10..250);
                let quantity = Decimal::from(qty_val);

                let tick = TradeTick {
                    sequence_number: seq,
                    instrument: symbol.clone(),
                    price: current_price,
                    quantity,
                    side,
                    source_timestamp: now,
                    received_timestamp: now,
                };

                // Generate Quote
                let spread = Decimal::from_str("0.02").unwrap();
                let half_spread = spread / Decimal::from(2);
                let bid_size_val: u64 = rand::thread_rng().gen_range(100..1000);
                let ask_size_val: u64 = rand::thread_rng().gen_range(100..1000);

                let quote = Quote {
                    sequence_number: seq,
                    instrument: symbol.clone(),
                    bid_price: current_price - half_spread,
                    bid_size: Decimal::from(bid_size_val),
                    ask_price: current_price + half_spread,
                    ask_size: Decimal::from(ask_size_val),
                    timestamp: now,
                };

                // Send Tick and Quote events
                if tx.send(MarketEvent::Tick(tick)).await.is_err() {
                    break;
                }
                let _ = tx.send(MarketEvent::Quote(quote)).await;

                // Periodic Status Event every 20 ticks
                if total_events % 20 == 0 {
                    let status = MarketStatus {
                        mode: MarketDataMode::SYNTHETIC,
                        active_symbol: symbol.clone(),
                        connected: true,
                        events_received: total_events,
                        events_lost: 0,
                        estimated_delay_ms: 2,
                        last_timestamp: now,
                    };
                    let _ = tx.send(MarketEvent::Status(status)).await;
                }

                // Sleep between 200ms and 500ms to simulate live scalping flow
                let delay: u64 = rand::thread_rng().gen_range(200..500);
                sleep(Duration::from_millis(delay)).await;
            }
        })
    }
}
