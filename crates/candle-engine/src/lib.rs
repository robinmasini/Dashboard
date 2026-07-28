use chrono::{DateTime, TimeZone, Utc};
use rust_decimal::Decimal;
use std::collections::HashMap;
use tradeview_domain::{Candle, Timeframe, TradeTick};

pub struct CandleEngine {
    active_candles: HashMap<Timeframe, Candle>,
}

impl CandleEngine {
    pub fn new() -> Self {
        Self {
            active_candles: HashMap::new(),
        }
    }

    pub fn process_tick(&mut self, tick: &TradeTick) -> Vec<Candle> {
        let timeframes = [
            Timeframe::S1,
            Timeframe::S5,
            Timeframe::S15,
            Timeframe::M1,
            Timeframe::M5,
        ];

        let mut produced_candles = Vec::new();

        for tf in timeframes {
            let tf_secs = tf.as_seconds();
            let tick_ts = tick.source_timestamp.timestamp();
            let bucket_start_ts = (tick_ts / tf_secs) * tf_secs;
            let open_time = Utc.timestamp_opt(bucket_start_ts, 0).unwrap();
            let close_time = Utc.timestamp_opt(bucket_start_ts + tf_secs, 0).unwrap();

            if let Some(current_candle) = self.active_candles.get_mut(&tf) {
                if current_candle.open_time == open_time {
                    // Update ongoing candle
                    current_candle.high = current_candle.high.max(tick.price);
                    current_candle.low = current_candle.low.min(tick.price);
                    current_candle.close = tick.price;
                    current_candle.volume += tick.quantity;
                    current_candle.ticks_count += 1;
                    produced_candles.push(current_candle.clone());
                    continue;
                } else {
                    // Close previous candle
                    let mut closed = current_candle.clone();
                    closed.is_closed = true;
                    produced_candles.push(closed);
                }
            }

            // Create new candle for timeframe
            let new_candle = Candle {
                instrument: tick.instrument.clone(),
                timeframe: tf,
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

            self.active_candles.insert(tf, new_candle.clone());
            produced_candles.push(new_candle);
        }

        produced_candles
    }
}
