use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tradeview_clock::TradingClock;
use tradeview_domain::{Envelope, InstrumentId, MarketEvent, SequenceNumber, Timestamp};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SessionMetadata {
    pub session_id: String,
    pub start_time: Timestamp,
    pub instrument: InstrumentId,
    pub event_count: u64,
}

/// In-memory store. Durable append-only persistence lands in Phase 3, which is
/// what makes replay possible; until then this only serves the live UI.
pub struct LocalEventStore {
    metadata: Arc<Mutex<SessionMetadata>>,
    events: Arc<Mutex<Vec<Envelope<MarketEvent>>>>,
    clock: Arc<dyn TradingClock>,
}

impl LocalEventStore {
    pub fn new(session_id: &str, instrument: InstrumentId, clock: Arc<dyn TradingClock>) -> Self {
        Self {
            metadata: Arc::new(Mutex::new(SessionMetadata {
                session_id: session_id.to_string(),
                start_time: clock.now(),
                instrument,
                event_count: 0,
            })),
            events: Arc::new(Mutex::new(Vec::new())),
            clock,
        }
    }

    pub async fn record(&self, event: MarketEvent) -> Envelope<MarketEvent> {
        let mut events = self.events.lock().await;
        let sequence = SequenceNumber::new(events.len() as u64 + 1);
        let envelope = Envelope::new(sequence, self.clock.now(), event);
        events.push(envelope.clone());

        let mut metadata = self.metadata.lock().await;
        metadata.event_count = events.len() as u64;

        envelope
    }

    pub async fn all_events(&self) -> Vec<Envelope<MarketEvent>> {
        self.events.lock().await.clone()
    }

    pub async fn metadata(&self) -> SessionMetadata {
        self.metadata.lock().await.clone()
    }

    pub async fn count(&self) -> usize {
        self.events.lock().await.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;
    use tradeview_clock::VirtualClock;
    use tradeview_domain::{MarketDataMode, MarketStatus};

    fn status_event() -> MarketEvent {
        MarketEvent::Status(MarketStatus {
            mode: MarketDataMode::Synthetic,
            active_symbol: InstrumentId::new("NVDA"),
            connected: true,
            events_received: 1,
            events_lost: 0,
            estimated_delay_ms: 0,
            last_timestamp: Timestamp::from_nanos(0),
        })
    }

    fn store(clock: Arc<VirtualClock>) -> LocalEventStore {
        LocalEventStore::new("session-1", InstrumentId::new("NVDA"), clock)
    }

    #[tokio::test]
    async fn recorded_events_are_numbered_from_one_without_gaps() {
        let store = store(Arc::new(VirtualClock::from_nanos(0)));
        for _ in 0..3 {
            store.record(status_event()).await;
        }

        let sequences: Vec<_> = store
            .all_events()
            .await
            .iter()
            .map(|e| e.sequence.value())
            .collect();
        assert_eq!(sequences, vec![1, 2, 3]);
        assert_eq!(store.count().await, 3);
    }

    #[tokio::test]
    async fn each_event_is_stamped_by_the_injected_clock() {
        let clock = Arc::new(VirtualClock::from_nanos(0));
        let store = store(clock.clone());

        let first = store.record(status_event()).await;
        clock.advance(Duration::seconds(5));
        let second = store.record(status_event()).await;

        assert_eq!(first.recorded_at, Timestamp::from_nanos(0));
        assert_eq!(second.recorded_at, Timestamp::from_nanos(5_000_000_000));
    }

    #[tokio::test]
    async fn metadata_tracks_the_running_event_count() {
        let store = store(Arc::new(VirtualClock::from_nanos(0)));
        store.record(status_event()).await;
        store.record(status_event()).await;

        let metadata = store.metadata().await;
        assert_eq!(metadata.event_count, 2);
        assert_eq!(metadata.instrument, InstrumentId::new("NVDA"));
        assert_eq!(metadata.start_time, Timestamp::from_nanos(0));
    }
}
