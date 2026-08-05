use ibapi::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_stream::StreamExt;
use tradeview_clock::TradingClock;
use tradeview_domain::Timestamp;

/// A headline as it reaches the operator. The article body is deliberately not
/// fetched: most providers bill per article, and a headline is enough to decide
/// whether to open it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NewsItem {
    pub provider: String,
    pub article_id: String,
    pub headline: String,
    pub timestamp: Timestamp,
}

/// Broadcast in the same tagged shape as market and execution events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum NewsEvent {
    News(NewsItem),
}

/// Streams every bulletin Interactive Brokers pushes to this account.
///
/// Bulletins need no per-provider subscription: they carry exchange notices and
/// system messages, which is what an operator needs to see whatever else they
/// pay for. Provider feeds are requested separately, and only for the codes the
/// account actually holds.
pub fn spawn_news_stream(
    client: Arc<Client>,
    clock: Arc<dyn TradingClock>,
    tx: mpsc::Sender<NewsEvent>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let _connection = client.clone();

        let subscription = match client.news_bulletins(true).await {
            Ok(subscription) => subscription,
            Err(error) => {
                tracing::warn!(%error, "news bulletins unavailable");
                return;
            }
        };

        let mut stream = subscription.filter_data();
        while let Some(update) = stream.next().await {
            let bulletin = match update {
                Ok(bulletin) => bulletin,
                Err(error) => {
                    tracing::warn!(%error, "news bulletin error");
                    continue;
                }
            };

            let item = NewsItem {
                provider: format!("IBKR · {}", bulletin.exchange),
                article_id: bulletin.message_id.to_string(),
                headline: bulletin.message,
                timestamp: clock.now(),
            };

            if tx.send(NewsEvent::News(item)).await.is_err() {
                break;
            }
        }
    })
}

/// Provider codes the account may read, as the broker reports them.
pub async fn available_providers(client: &Client) -> Vec<(String, String)> {
    match client.news_providers().await {
        Ok(providers) => providers
            .into_iter()
            .map(|provider| (provider.code, provider.name))
            .collect(),
        Err(error) => {
            tracing::warn!(%error, "could not list news providers");
            Vec::new()
        }
    }
}
