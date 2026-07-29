use chrono::{Duration, Utc};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use tradeview_domain::Timestamp;

pub trait TradingClock: Send + Sync {
    fn now(&self) -> Timestamp;
}

impl<T: TradingClock + ?Sized> TradingClock for Arc<T> {
    fn now(&self) -> Timestamp {
        (**self).now()
    }
}

#[derive(Debug, Default, Clone, Copy)]
pub struct SystemClock;

impl SystemClock {
    pub fn new() -> Self {
        Self
    }
}

impl TradingClock for SystemClock {
    fn now(&self) -> Timestamp {
        Timestamp::new(Utc::now())
    }
}

/// A clock whose time only moves when the caller advances it, so a replay of the
/// same inputs produces the same timestamps on every run.
#[derive(Debug)]
pub struct VirtualClock {
    nanos: AtomicI64,
}

impl VirtualClock {
    pub fn new(start: Timestamp) -> Self {
        Self {
            nanos: AtomicI64::new(start.nanos()),
        }
    }

    pub fn from_nanos(nanos: i64) -> Self {
        Self {
            nanos: AtomicI64::new(nanos),
        }
    }

    pub fn advance(&self, duration: Duration) {
        let by = duration
            .num_nanoseconds()
            .expect("duration too large to express in nanoseconds");
        assert!(by >= 0, "a trading clock must never move backwards");
        self.nanos.fetch_add(by, Ordering::SeqCst);
    }

    pub fn set(&self, timestamp: Timestamp) {
        let target = timestamp.nanos();
        let previous = self.nanos.swap(target, Ordering::SeqCst);
        assert!(
            target >= previous,
            "a trading clock must never move backwards"
        );
    }
}

impl TradingClock for VirtualClock {
    fn now(&self) -> Timestamp {
        Timestamp::from_nanos(self.nanos.load(Ordering::SeqCst))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_virtual_clock_stands_still_until_advanced() {
        let clock = VirtualClock::from_nanos(1_700_000_000_000_000_000);
        let first = clock.now();
        let second = clock.now();
        assert_eq!(first, second);

        clock.advance(Duration::seconds(5));
        assert_eq!(clock.now().nanos(), first.nanos() + 5_000_000_000);
    }

    #[test]
    fn two_runs_over_the_same_script_produce_identical_timestamps() {
        let script = [1, 30, 90, 4];

        let run = || {
            let clock = VirtualClock::from_nanos(0);
            let mut seen = Vec::new();
            for seconds in script {
                clock.advance(Duration::seconds(seconds));
                seen.push(clock.now());
            }
            seen
        };

        assert_eq!(run(), run());
    }

    #[test]
    #[should_panic(expected = "never move backwards")]
    fn setting_the_clock_into_the_past_is_rejected() {
        let clock = VirtualClock::from_nanos(1_000);
        clock.set(Timestamp::from_nanos(999));
    }

    #[test]
    fn set_jumps_straight_to_an_event_timestamp() {
        let clock = VirtualClock::from_nanos(0);
        let target = Timestamp::from_nanos(1_700_000_000_123_456_789);
        clock.set(target);
        assert_eq!(clock.now(), target);
    }

    #[test]
    fn the_system_clock_moves_on_its_own() {
        let clock = SystemClock::new();
        let first = clock.now();
        std::thread::sleep(std::time::Duration::from_millis(2));
        assert!(clock.now() >= first);
    }

    #[test]
    fn a_clock_can_be_shared_across_threads_behind_an_arc() {
        let clock = Arc::new(VirtualClock::from_nanos(0));
        let handles: Vec<_> = (0..4)
            .map(|_| {
                let clock = Arc::clone(&clock);
                std::thread::spawn(move || clock.advance(Duration::seconds(1)))
            })
            .collect();
        for handle in handles {
            handle.join().unwrap();
        }
        assert_eq!(clock.now().nanos(), 4_000_000_000);
    }
}
