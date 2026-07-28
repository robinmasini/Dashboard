use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tradeview_domain::MarketEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetadata {
    pub session_id: String,
    pub start_time: DateTime<Utc>,
    pub instrument: String,
    pub event_count: u64,
}

pub struct LocalEventStore {
    metadata: SessionMetadata,
    events: Arc<Mutex<Vec<MarketEvent>>>,
}

impl LocalEventStore {
    pub fn new(session_id: &str, instrument: &str) -> Self {
        Self {
            metadata: SessionMetadata {
                session_id: session_id.to_string(),
                start_time: Utc::now(),
                instrument: instrument.to_string(),
                event_count: 0,
            },
            events: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn record(&self, event: MarketEvent) {
        let mut guard = self.events.lock().await;
        guard.push(event);
    }

    pub async fn get_all_events(&self) -> Vec<MarketEvent> {
        let guard = self.events.lock().await;
        guard.clone()
    }

    pub async fn count(&self) -> usize {
        let guard = self.events.lock().await;
        guard.len()
    }
}
