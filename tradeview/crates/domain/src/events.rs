use crate::ids::SequenceNumber;
use crate::market::{Candle, MarketStatus, Quote, TradeTick};
use crate::orders::{ExecutionRecord, OrderRecord};
use crate::risk::RiskDecision;
use crate::time::Timestamp;
use serde::{Deserialize, Serialize};

pub const SCHEMA_VERSION: u16 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum MarketEvent {
    Tick(TradeTick),
    Quote(Quote),
    Candle(Candle),
    Status(MarketStatus),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum EngineEvent {
    Market(MarketEvent),
    RiskDecision(RiskDecision),
    OrderUpdate(OrderRecord),
    Execution(ExecutionRecord),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Envelope<T> {
    pub schema_version: u16,
    pub sequence: SequenceNumber,
    pub recorded_at: Timestamp,
    pub payload: T,
}

impl<T> Envelope<T> {
    pub fn new(sequence: SequenceNumber, recorded_at: Timestamp, payload: T) -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            sequence,
            recorded_at,
            payload,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ids::InstrumentId;
    use crate::market::MarketDataMode;

    fn sample_status() -> MarketStatus {
        MarketStatus {
            mode: MarketDataMode::Synthetic,
            active_symbol: InstrumentId::new("NVDA"),
            connected: true,
            events_received: 10,
            events_lost: 0,
            estimated_delay_ms: 3,
            last_timestamp: Timestamp::from_nanos(1_700_000_000_000_000_000),
        }
    }

    #[test]
    fn every_persisted_event_carries_its_schema_version() {
        let envelope = Envelope::new(
            SequenceNumber::new(7),
            Timestamp::from_nanos(0),
            MarketEvent::Status(sample_status()),
        );
        let json = serde_json::to_value(&envelope).unwrap();
        assert_eq!(json["schema_version"], SCHEMA_VERSION);
        assert_eq!(json["sequence"], 7);
    }

    #[test]
    fn market_events_are_tagged_so_the_front_can_discriminate_them() {
        let json = serde_json::to_value(MarketEvent::Status(sample_status())).unwrap();
        assert_eq!(json["type"], "Status");
        assert_eq!(json["payload"]["active_symbol"], "NVDA");
    }

    #[test]
    fn envelopes_round_trip_without_loss() {
        let envelope = Envelope::new(
            SequenceNumber::new(3),
            Timestamp::from_nanos(1_234_567_890_000_000_000),
            MarketEvent::Status(sample_status()),
        );
        let json = serde_json::to_string(&envelope).unwrap();
        let back: Envelope<MarketEvent> = serde_json::from_str(&json).unwrap();
        assert_eq!(back, envelope);
    }
}
