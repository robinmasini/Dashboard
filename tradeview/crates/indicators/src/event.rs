use crate::blocks::BlockAnalysis;
use crate::steps::StepAnalysis;
use serde::{Deserialize, Serialize};
use tradeview_domain::{Candle, InstrumentId, Timeframe};

/// Rolling window of closed candles kept so the analytics can be recomputed as
/// the session advances. Bounded: a scalping session would otherwise grow this
/// without limit over a 23-hour futures day.
pub struct IndicatorWindow {
    timeframe: Timeframe,
    capacity: usize,
    candles: Vec<Candle>,
    density: u32,
}

impl IndicatorWindow {
    pub fn new(timeframe: Timeframe, capacity: usize, density: u32) -> Self {
        Self {
            timeframe,
            capacity: capacity.max(2),
            candles: Vec::new(),
            density: density.max(1),
        }
    }

    pub fn timeframe(&self) -> Timeframe {
        self.timeframe
    }

    pub fn len(&self) -> usize {
        self.candles.len()
    }

    pub fn is_empty(&self) -> bool {
        self.candles.is_empty()
    }

    /// Absorbs a candle, replacing the live one in place rather than appending,
    /// so a bar still forming does not count as a new block on every tick.
    pub fn accept(&mut self, candle: &Candle) -> bool {
        if candle.timeframe != self.timeframe {
            return false;
        }

        match self.candles.last_mut() {
            Some(last) if last.open_time == candle.open_time => {
                *last = candle.clone();
            }
            _ => {
                self.candles.push(candle.clone());
                if self.candles.len() > self.capacity {
                    let excess = self.candles.len() - self.capacity;
                    self.candles.drain(0..excess);
                }
            }
        }
        true
    }

    pub fn analyse(&self, instrument: &InstrumentId) -> IndicatorSnapshot {
        IndicatorSnapshot {
            instrument: instrument.clone(),
            timeframe: self.timeframe,
            candles: self.candles.len(),
            blocks: crate::blocks::analyse(&self.candles),
            steps: crate::steps::analyse(&self.candles, self.density),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct IndicatorSnapshot {
    pub instrument: InstrumentId,
    pub timeframe: Timeframe,
    pub candles: usize,
    pub blocks: BlockAnalysis,
    pub steps: StepAnalysis,
}

/// Broadcast alongside market and execution events, in the same tagged shape.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum IndicatorEvent {
    Indicators(IndicatorSnapshot),
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;
    use tradeview_domain::{Price, Quantity, Timestamp};

    fn candle(index: i64, open: i64, close: i64, timeframe: Timeframe) -> Candle {
        let (low, high) = if open <= close {
            (open, close)
        } else {
            (close, open)
        };
        let price = |v: i64| Price::new(Decimal::from(v)).expect("positive");
        Candle {
            instrument: InstrumentId::new("MES"),
            timeframe,
            open: price(open),
            high: price(high),
            low: price(low),
            close: price(close),
            volume: Quantity::new(Decimal::from(1)).expect("positive"),
            open_time: Timestamp::from_nanos(index * 300 * 1_000_000_000),
            close_time: Timestamp::from_nanos((index + 1) * 300 * 1_000_000_000),
            ticks_count: 1,
            is_closed: true,
        }
    }

    #[test]
    fn candles_of_another_timeframe_are_refused() {
        let mut window = IndicatorWindow::new(Timeframe::M5, 10, 1);
        assert!(!window.accept(&candle(0, 100, 101, Timeframe::S1)));
        assert!(window.is_empty());
    }

    #[test]
    fn a_forming_candle_replaces_itself_instead_of_accumulating() {
        let mut window = IndicatorWindow::new(Timeframe::M5, 10, 1);
        window.accept(&candle(0, 100, 101, Timeframe::M5));
        window.accept(&candle(0, 100, 105, Timeframe::M5));
        window.accept(&candle(0, 100, 103, Timeframe::M5));

        assert_eq!(window.len(), 1, "one bar must stay one bar while it forms");
    }

    #[test]
    fn the_window_never_grows_past_its_capacity() {
        let mut window = IndicatorWindow::new(Timeframe::M5, 5, 1);
        for i in 0..40 {
            window.accept(&candle(i, 100 + i, 101 + i, Timeframe::M5));
        }
        assert_eq!(window.len(), 5);
    }

    #[test]
    fn the_oldest_candles_are_the_ones_dropped() {
        let mut window = IndicatorWindow::new(Timeframe::M5, 3, 1);
        for i in 0..6 {
            window.accept(&candle(i, 100, 101, Timeframe::M5));
        }
        let first_kept = window.candles.first().expect("window holds candles");
        assert_eq!(
            first_kept.open_time,
            Timestamp::from_nanos(3 * 300 * 1_000_000_000)
        );
    }

    #[test]
    fn a_capacity_below_two_is_raised_so_a_leg_can_exist() {
        let window = IndicatorWindow::new(Timeframe::M5, 0, 1);
        assert!(window.capacity >= 2);
    }

    #[test]
    fn the_snapshot_carries_both_analyses_and_the_instrument() {
        let mut window = IndicatorWindow::new(Timeframe::M5, 20, 1);
        for i in 0..6 {
            window.accept(&candle(i, 100 + i, 102 + i, Timeframe::M5));
        }
        let snapshot = window.analyse(&InstrumentId::new("MES"));

        assert_eq!(snapshot.instrument, InstrumentId::new("MES"));
        assert_eq!(snapshot.candles, 6);
        assert!(!snapshot.blocks.blocks.is_empty());
        assert!(snapshot.steps.step > Decimal::ZERO);
    }

    #[test]
    fn the_event_serialises_with_the_shared_tag_and_payload_shape() {
        let window = IndicatorWindow::new(Timeframe::M5, 10, 1);
        let event = IndicatorEvent::Indicators(window.analyse(&InstrumentId::new("MES")));
        let json = serde_json::to_string(&event).expect("serialises");

        assert!(json.starts_with(r#"{"type":"Indicators","payload":"#));
    }
}
