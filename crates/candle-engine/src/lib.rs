use std::collections::HashMap;
use tradeview_domain::{Candle, InstrumentId, Timeframe, Timestamp, TradeTick};

const TIMEFRAMES: [Timeframe; 5] = [
    Timeframe::S1,
    Timeframe::S5,
    Timeframe::S15,
    Timeframe::M1,
    Timeframe::M5,
];

#[derive(Debug, Default)]
pub struct CandleEngine {
    active: HashMap<(InstrumentId, Timeframe), Candle>,
}

impl CandleEngine {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn process_tick(&mut self, tick: &TradeTick) -> Vec<Candle> {
        let mut produced = Vec::new();

        for timeframe in TIMEFRAMES {
            let seconds = timeframe.as_seconds();
            let bucket = tick
                .source_timestamp
                .as_datetime()
                .timestamp()
                .div_euclid(seconds)
                * seconds;
            let open_time = Timestamp::from_nanos(bucket * 1_000_000_000);
            let close_time = Timestamp::from_nanos((bucket + seconds) * 1_000_000_000);

            let key = (tick.instrument.clone(), timeframe);

            if let Some(candle) = self.active.get_mut(&key) {
                if candle.open_time == open_time {
                    candle.high = candle.high.max(tick.price);
                    candle.low = candle.low.min(tick.price);
                    candle.close = tick.price;
                    candle.volume = candle.volume + tick.quantity;
                    candle.ticks_count += 1;
                    produced.push(candle.clone());
                    continue;
                }

                let mut closed = candle.clone();
                closed.is_closed = true;
                produced.push(closed);
            }

            let candle = Candle {
                instrument: tick.instrument.clone(),
                timeframe,
                open: tick.price,
                high: tick.price,
                low: tick.price,
                close: tick.price,
                volume: tick.quantity,
                open_time,
                close_time,
                ticks_count: 1,
                is_closed: false,
            };
            self.active.insert(key, candle.clone());
            produced.push(candle);
        }

        produced
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;
    use tradeview_domain::{OrderSide, Price, Quantity, SequenceNumber};

    fn tick(symbol: &str, price_cents: i64, quantity: i64, at_seconds: i64) -> TradeTick {
        let at = Timestamp::from_nanos(at_seconds * 1_000_000_000);
        TradeTick {
            sequence_number: SequenceNumber::new(1),
            instrument: InstrumentId::new(symbol),
            price: Price::new(Decimal::new(price_cents, 2)).unwrap(),
            quantity: Quantity::new(Decimal::from(quantity)).unwrap(),
            side: OrderSide::Buy,
            source_timestamp: at,
            received_timestamp: at,
        }
    }

    fn candle_for(candles: &[Candle], timeframe: Timeframe) -> Candle {
        candles
            .iter()
            .find(|c| c.timeframe == timeframe)
            .expect("timeframe present")
            .clone()
    }

    #[test]
    fn every_timeframe_gets_a_candle_from_the_first_tick() {
        let mut engine = CandleEngine::new();
        let produced = engine.process_tick(&tick("NVDA", 21_175, 10, 0));
        assert_eq!(produced.len(), TIMEFRAMES.len());
        assert!(produced.iter().all(|c| c.ticks_count == 1));
    }

    #[test]
    fn ticks_inside_the_same_bucket_aggregate_ohlcv() {
        let mut engine = CandleEngine::new();
        engine.process_tick(&tick("NVDA", 21_000, 10, 0));
        engine.process_tick(&tick("NVDA", 21_500, 5, 1));
        let produced = engine.process_tick(&tick("NVDA", 20_800, 7, 2));

        let m1 = candle_for(&produced, Timeframe::M1);
        assert_eq!(m1.open, Price::new(Decimal::new(21_000, 2)).unwrap());
        assert_eq!(m1.high, Price::new(Decimal::new(21_500, 2)).unwrap());
        assert_eq!(m1.low, Price::new(Decimal::new(20_800, 2)).unwrap());
        assert_eq!(m1.close, Price::new(Decimal::new(20_800, 2)).unwrap());
        assert_eq!(m1.volume, Quantity::new(Decimal::from(22)).unwrap());
        assert_eq!(m1.ticks_count, 3);
    }

    #[test]
    fn crossing_a_bucket_boundary_closes_the_previous_candle() {
        let mut engine = CandleEngine::new();
        engine.process_tick(&tick("NVDA", 21_000, 10, 0));
        let produced = engine.process_tick(&tick("NVDA", 21_100, 10, 61));

        let closed: Vec<_> = produced.iter().filter(|c| c.is_closed).collect();
        let m1_closed = closed
            .iter()
            .find(|c| c.timeframe == Timeframe::M1)
            .expect("the 1m candle closed");
        assert_eq!(
            m1_closed.close,
            Price::new(Decimal::new(21_000, 2)).unwrap()
        );
        assert_eq!(m1_closed.ticks_count, 1);
    }

    #[test]
    fn buckets_align_to_the_timeframe_boundary() {
        let mut engine = CandleEngine::new();
        let produced = engine.process_tick(&tick("NVDA", 21_000, 10, 137));

        let m1 = candle_for(&produced, Timeframe::M1);
        assert_eq!(m1.open_time, Timestamp::from_nanos(120 * 1_000_000_000));
        assert_eq!(m1.close_time, Timestamp::from_nanos(180 * 1_000_000_000));

        let s15 = candle_for(&produced, Timeframe::S15);
        assert_eq!(s15.open_time, Timestamp::from_nanos(135 * 1_000_000_000));
    }

    #[test]
    fn two_symbols_do_not_share_a_candle() {
        let mut engine = CandleEngine::new();
        engine.process_tick(&tick("NVDA", 21_000, 10, 0));
        let produced = engine.process_tick(&tick("AAPL", 19_000, 4, 1));

        let aapl_m1 = candle_for(&produced, Timeframe::M1);
        assert_eq!(aapl_m1.instrument, InstrumentId::new("AAPL"));
        assert_eq!(aapl_m1.ticks_count, 1);
        assert_eq!(aapl_m1.volume, Quantity::new(Decimal::from(4)).unwrap());
        assert!(produced.iter().all(|c| !c.is_closed));
    }
}
