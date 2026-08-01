use crate::ids::{InstrumentId, SequenceNumber};
use crate::money::{Price, Quantity};
use crate::orders::OrderSide;
use crate::time::Timestamp;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MarketDataMode {
    Realtime,
    Delayed,
    Frozen,
    Replay,
    Synthetic,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Timeframe {
    S1,
    S5,
    S15,
    M1,
    M5,
}

impl Timeframe {
    pub fn as_seconds(&self) -> i64 {
        match self {
            Timeframe::S1 => 1,
            Timeframe::S5 => 5,
            Timeframe::S15 => 15,
            Timeframe::M1 => 60,
            Timeframe::M5 => 300,
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            Timeframe::S1 => "1s",
            Timeframe::S5 => "5s",
            Timeframe::S15 => "15s",
            Timeframe::M1 => "1m",
            Timeframe::M5 => "5m",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TradeTick {
    pub sequence_number: SequenceNumber,
    pub instrument: InstrumentId,
    pub price: Price,
    pub quantity: Quantity,
    pub side: OrderSide,
    pub source_timestamp: Timestamp,
    pub received_timestamp: Timestamp,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Quote {
    pub sequence_number: SequenceNumber,
    pub instrument: InstrumentId,
    pub bid_price: Price,
    pub bid_size: Quantity,
    pub ask_price: Price,
    pub ask_size: Quantity,
    pub timestamp: Timestamp,
}

impl Quote {
    pub fn spread(&self) -> rust_decimal::Decimal {
        self.ask_price.value() - self.bid_price.value()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Candle {
    pub instrument: InstrumentId,
    pub timeframe: Timeframe,
    pub open: Price,
    pub high: Price,
    pub low: Price,
    pub close: Price,
    pub volume: Quantity,
    pub open_time: Timestamp,
    pub close_time: Timestamp,
    pub ticks_count: u64,
    pub is_closed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MarketStatus {
    pub mode: MarketDataMode,
    pub active_symbol: InstrumentId,
    pub connected: bool,
    /// False while the feed is deliberately halted. Distinct from `connected`:
    /// the source is reachable, it is simply not being consumed.
    pub feed_running: bool,
    pub events_received: u64,
    pub events_lost: u64,
    pub estimated_delay_ms: i64,
    pub last_timestamp: Timestamp,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn market_data_mode_keeps_its_screaming_snake_wire_format() {
        assert_eq!(
            serde_json::to_string(&MarketDataMode::Realtime).unwrap(),
            r#""REALTIME""#
        );
        assert_eq!(
            serde_json::to_string(&MarketDataMode::Synthetic).unwrap(),
            r#""SYNTHETIC""#
        );
    }

    #[test]
    fn timeframe_seconds_match_their_labels() {
        assert_eq!(Timeframe::M1.as_seconds(), 60);
        assert_eq!(Timeframe::M1.label(), "1m");
        assert_eq!(Timeframe::S15.as_seconds(), 15);
    }
}
