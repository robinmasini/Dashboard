use rand::Rng;
use rand::SeedableRng;
use rand_chacha::ChaCha8Rng;
use rust_decimal::Decimal;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use tradeview_clock::TradingClock;
use tradeview_domain::{
    InstrumentId, MarketDataMode, MarketEvent, MarketStatus, OrderSide, Price, Quantity, Quote,
    SequenceNumber, TradeTick,
};

const FLOOR_PRICE: Decimal = Decimal::from_parts(15_000, 0, 0, false, 2);
const RESET_PRICE: Decimal = Decimal::from_parts(20_000, 0, 0, false, 2);
const HALF_SPREAD: Decimal = Decimal::from_parts(1, 0, 0, false, 2);

/// Seeded synthetic feed: the same seed and the same clock always yield the
/// same sequence of events, which is what makes a replay reproducible.
pub struct SyntheticMarketGenerator {
    symbol: InstrumentId,
    rng: ChaCha8Rng,
    price: Decimal,
    sequence: SequenceNumber,
    events_emitted: u64,
    clock: Arc<dyn TradingClock>,
}

impl SyntheticMarketGenerator {
    pub fn new(symbol: &str, seed: u64, clock: Arc<dyn TradingClock>) -> Self {
        Self {
            symbol: InstrumentId::new(symbol),
            rng: ChaCha8Rng::seed_from_u64(seed),
            price: Decimal::new(21_175, 2),
            sequence: SequenceNumber::ZERO,
            events_emitted: 0,
            clock,
        }
    }

    pub fn symbol(&self) -> &InstrumentId {
        &self.symbol
    }

    /// Advances the generator by one tick, returning the events it produced.
    pub fn step(&mut self) -> Vec<MarketEvent> {
        let delta = Decimal::new(self.rng.gen_range(-35..=35), 2);
        self.price += delta;
        if self.price < FLOOR_PRICE {
            self.price = RESET_PRICE;
        }

        self.sequence = self.sequence.next();
        self.events_emitted += 1;
        let now = self.clock.now();

        let price = Price::new(self.price).expect("synthetic price stays above the floor");
        let side = if delta >= Decimal::ZERO {
            OrderSide::Buy
        } else {
            OrderSide::Sell
        };

        let tick = TradeTick {
            sequence_number: self.sequence,
            instrument: self.symbol.clone(),
            price,
            quantity: Quantity::new(Decimal::from(self.rng.gen_range(10..250))).expect("positive"),
            side,
            source_timestamp: now,
            received_timestamp: now,
        };

        let quote = Quote {
            sequence_number: self.sequence,
            instrument: self.symbol.clone(),
            bid_price: Price::new(self.price - HALF_SPREAD).expect("bid stays above zero"),
            bid_size: Quantity::new(Decimal::from(self.rng.gen_range(100..1000)))
                .expect("positive"),
            ask_price: Price::new(self.price + HALF_SPREAD).expect("ask stays above zero"),
            ask_size: Quantity::new(Decimal::from(self.rng.gen_range(100..1000)))
                .expect("positive"),
            timestamp: now,
        };

        let mut events = vec![MarketEvent::Tick(tick), MarketEvent::Quote(quote)];

        if self.events_emitted.is_multiple_of(20) {
            events.push(MarketEvent::Status(MarketStatus {
                mode: MarketDataMode::Synthetic,
                active_symbol: self.symbol.clone(),
                connected: true,
                events_received: self.events_emitted,
                events_lost: 0,
                estimated_delay_ms: 2,
                last_timestamp: now,
            }));
        }

        events
    }

    /// Drives `step` in wall-clock time. The pacing is deliberately outside the
    /// generator: replay drives `step` directly instead.
    pub fn spawn(mut self, tx: mpsc::Sender<MarketEvent>) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            loop {
                for event in self.step() {
                    if tx.send(event).await.is_err() {
                        return;
                    }
                }
                let delay = self.rng.gen_range(200..500);
                sleep(Duration::from_millis(delay)).await;
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration as ChronoDuration;
    use tradeview_clock::VirtualClock;

    fn generator(seed: u64) -> (SyntheticMarketGenerator, Arc<VirtualClock>) {
        let clock = Arc::new(VirtualClock::from_nanos(1_700_000_000_000_000_000));
        let generator = SyntheticMarketGenerator::new("NVDA", seed, clock.clone());
        (generator, clock)
    }

    fn run(seed: u64, steps: usize) -> Vec<MarketEvent> {
        let (mut generator, clock) = generator(seed);
        let mut events = Vec::new();
        for _ in 0..steps {
            events.extend(generator.step());
            clock.advance(ChronoDuration::milliseconds(250));
        }
        events
    }

    #[test]
    fn the_same_seed_replays_the_same_session_exactly() {
        assert_eq!(run(42, 50), run(42, 50));
    }

    #[test]
    fn a_different_seed_produces_a_different_session() {
        assert_ne!(run(42, 50), run(43, 50));
    }

    #[test]
    fn sequence_numbers_increase_by_one_per_step() {
        let (mut generator, _clock) = generator(7);
        let mut previous = SequenceNumber::ZERO;
        for _ in 0..10 {
            for event in generator.step() {
                if let MarketEvent::Tick(tick) = event {
                    assert_eq!(tick.sequence_number, previous.next());
                    previous = tick.sequence_number;
                }
            }
        }
    }

    #[test]
    fn timestamps_come_from_the_injected_clock_not_the_wall_clock() {
        let (mut generator, clock) = generator(1);
        clock.advance(ChronoDuration::seconds(60));
        let expected = clock.now();

        match &generator.step()[0] {
            MarketEvent::Tick(tick) => assert_eq!(tick.source_timestamp, expected),
            other => panic!("expected a tick, got {other:?}"),
        }
    }

    #[test]
    fn quotes_straddle_the_trade_price() {
        let (mut generator, _clock) = generator(3);
        for event in generator.step() {
            if let MarketEvent::Quote(quote) = event {
                assert!(quote.bid_price < quote.ask_price);
                assert_eq!(quote.spread(), Decimal::new(2, 2));
            }
        }
    }

    #[test]
    fn a_status_event_is_emitted_every_twenty_steps() {
        let (mut generator, _clock) = generator(5);
        let mut statuses = 0;
        for _ in 0..40 {
            statuses += generator
                .step()
                .iter()
                .filter(|e| matches!(e, MarketEvent::Status(_)))
                .count();
        }
        assert_eq!(statuses, 2);
    }
}
