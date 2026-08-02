use rand::Rng;
use rand::SeedableRng;
use rand_chacha::ChaCha8Rng;
use rust_decimal::Decimal;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use tradeview_clock::TradingClock;
use tradeview_domain::{
    InstrumentId, MarketDataMode, MarketEvent, MarketStatus, OrderSide, Price, Quantity, Quote,
    SequenceNumber, TradeTick,
};

/// Price behaviour of the instrument being simulated. Kept out of the
/// generator because a feed quoting a $211 stock is not a stand-in for an
/// index at 6,800 points: the tick size, the spread and the scale of a move
/// all differ, and every downstream figure inherits them.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InstrumentProfile {
    pub start_price: Decimal,
    /// Below this the walk is reset, so a long run cannot drift to zero.
    pub floor_price: Decimal,
    pub reset_price: Decimal,
    /// Smallest price increment. Every emitted price is a multiple of it.
    pub tick_size: Decimal,
    /// Widest single move, expressed in ticks.
    pub max_move_ticks: i64,
    /// Half the bid/ask spread, also a multiple of the tick.
    pub half_spread: Decimal,
}

impl InstrumentProfile {
    /// Micro E-mini S&P 500: quarter-point ticks, a spread that is usually a
    /// single tick, and an index level in the thousands.
    pub fn micro_es() -> Self {
        Self {
            start_price: Decimal::new(680_000, 2),
            floor_price: Decimal::new(500_000, 2),
            reset_price: Decimal::new(650_000, 2),
            tick_size: Decimal::new(25, 2),
            // One tick per print. At a few prints a second this already yields
            // 15-second bars spanning a point or two, which is what the real
            // contract does; six ticks a print produced 40-point bars.
            max_move_ticks: 1,
            half_spread: Decimal::new(125, 3),
        }
    }

    /// Micro E-mini Nasdaq-100: the same quarter-point tick, but an index some
    /// four times higher and visibly more volatile than the S&P.
    pub fn micro_nasdaq() -> Self {
        Self {
            start_price: Decimal::new(2_500_000, 2),
            floor_price: Decimal::new(1_500_000, 2),
            reset_price: Decimal::new(2_400_000, 2),
            tick_size: Decimal::new(25, 2),
            max_move_ticks: 3,
            half_spread: Decimal::new(125, 3),
        }
    }

    /// Profile for a known CME micro contract, if there is one.
    pub fn for_symbol(symbol: &str) -> Option<Self> {
        match symbol.to_uppercase().as_str() {
            "MES" | "ES" => Some(Self::micro_es()),
            "MNQ" | "NQ" => Some(Self::micro_nasdaq()),
            _ => None,
        }
    }
}

impl Default for InstrumentProfile {
    fn default() -> Self {
        Self::micro_es()
    }
}

/// Seeded synthetic feed: the same seed and the same clock always yield the
/// same sequence of events, which is what makes a replay reproducible.
pub struct SyntheticMarketGenerator {
    symbol: InstrumentId,
    profile: InstrumentProfile,
    rng: ChaCha8Rng,
    price: Decimal,
    sequence: SequenceNumber,
    events_emitted: u64,
    clock: Arc<dyn TradingClock>,
}

impl SyntheticMarketGenerator {
    pub fn new(symbol: &str, seed: u64, clock: Arc<dyn TradingClock>) -> Self {
        Self::with_profile(symbol, seed, InstrumentProfile::default(), clock)
    }

    pub fn with_profile(
        symbol: &str,
        seed: u64,
        profile: InstrumentProfile,
        clock: Arc<dyn TradingClock>,
    ) -> Self {
        Self {
            symbol: InstrumentId::new(symbol),
            price: profile.start_price,
            profile,
            rng: ChaCha8Rng::seed_from_u64(seed),
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
        // Moves are whole ticks: a real book never prints between them, and a
        // sub-tick walk would hand the indicators a precision that cannot exist.
        let ticks = self
            .rng
            .gen_range(-self.profile.max_move_ticks..=self.profile.max_move_ticks);
        let delta = Decimal::from(ticks) * self.profile.tick_size;
        self.price += delta;
        if self.price < self.profile.floor_price {
            self.price = self.profile.reset_price;
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
            bid_price: Price::new(self.price - self.profile.half_spread)
                .expect("bid stays above zero"),
            bid_size: Quantity::new(Decimal::from(self.rng.gen_range(100..1000)))
                .expect("positive"),
            ask_price: Price::new(self.price + self.profile.half_spread)
                .expect("ask stays above zero"),
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
                feed_running: true,
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
    pub fn spawn(self, tx: mpsc::Sender<MarketEvent>) -> tokio::task::JoinHandle<()> {
        self.spawn_gated(tx, Arc::new(AtomicBool::new(true)))
    }

    /// Same, but halted whenever `running` is false. Pausing stops the feed at
    /// the source rather than freezing the display: a chart frozen over a
    /// engine that kept filling would show prices nobody could have traded on.
    pub fn spawn_gated(
        mut self,
        tx: mpsc::Sender<MarketEvent>,
        running: Arc<AtomicBool>,
    ) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            loop {
                if !running.load(Ordering::Relaxed) {
                    sleep(Duration::from_millis(100)).await;
                    continue;
                }

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
        let generator = SyntheticMarketGenerator::new("MES", seed, clock.clone());
        (generator, clock)
    }

    #[test]
    fn every_price_lands_on_a_whole_tick() {
        let profile = InstrumentProfile::micro_es();
        for event in run(11, 400) {
            let price = match event {
                MarketEvent::Tick(tick) => tick.price.value(),
                _ => continue,
            };
            assert_eq!(
                price % profile.tick_size,
                Decimal::ZERO,
                "{price} is not a multiple of {}",
                profile.tick_size
            );
        }
    }

    #[test]
    fn the_spread_is_one_tick_wide() {
        let profile = InstrumentProfile::micro_es();
        for event in run(12, 100) {
            if let MarketEvent::Quote(quote) = event {
                let spread = quote.ask_price.value() - quote.bid_price.value();
                assert_eq!(spread, profile.tick_size);
            }
        }
    }

    #[test]
    fn prices_stay_at_an_index_level_not_a_share_price() {
        // A feed sitting near $211 would not be the S&P 500 by any other name.
        for event in run(13, 300) {
            if let MarketEvent::Tick(tick) = event {
                assert!(
                    tick.price.value() > Decimal::from(1000),
                    "index level expected, got {}",
                    tick.price.value()
                );
            }
        }
    }

    #[test]
    fn the_walk_never_falls_through_the_floor() {
        let profile = InstrumentProfile::micro_es();
        for event in run(14, 2000) {
            if let MarketEvent::Tick(tick) = event {
                assert!(tick.price.value() >= profile.floor_price);
            }
        }
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
                // Taken from the profile: the spread belongs to the instrument.
                assert_eq!(quote.spread(), InstrumentProfile::micro_es().tick_size);
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

    #[tokio::test]
    async fn a_halted_feed_emits_nothing() {
        let clock = Arc::new(VirtualClock::from_nanos(1_700_000_000_000_000_000));
        let (tx, mut rx) = mpsc::channel(64);
        let running = Arc::new(AtomicBool::new(false));

        SyntheticMarketGenerator::new("MES", 1, clock).spawn_gated(tx, running.clone());
        tokio::time::sleep(Duration::from_millis(400)).await;

        assert!(
            rx.try_recv().is_err(),
            "a paused feed must not deliver market data"
        );
    }

    #[tokio::test]
    async fn resuming_restarts_the_feed() {
        let clock = Arc::new(VirtualClock::from_nanos(1_700_000_000_000_000_000));
        let (tx, mut rx) = mpsc::channel(64);
        let running = Arc::new(AtomicBool::new(false));

        SyntheticMarketGenerator::new("MES", 1, clock).spawn_gated(tx, running.clone());
        tokio::time::sleep(Duration::from_millis(200)).await;
        running.store(true, Ordering::Relaxed);
        tokio::time::sleep(Duration::from_millis(400)).await;

        assert!(rx.try_recv().is_ok(), "resuming must deliver data again");
    }
}
