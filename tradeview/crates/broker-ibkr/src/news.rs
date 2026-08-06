use ibapi::contracts::Contract;
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

/// Loads the headlines already published today, so the newsletter is useful the
/// moment it opens rather than only once something new happens.
///
/// Historical news is per contract: IBKR indexes it by instrument, not by feed.
/// The traded contract is therefore what we ask about.
pub async fn load_todays_headlines(
    client: &Client,
    contract: &Contract,
    clock: &Arc<dyn TradingClock>,
    limit: u8,
) -> Vec<NewsItem> {
    let providers = available_providers(client).await;
    if providers.is_empty() {
        return Vec::new();
    }

    let details = match client.contract_details(contract).await {
        Ok(details) => details,
        Err(error) => {
            tracing::warn!(%error, "could not resolve the contract for news");
            return Vec::new();
        }
    };
    let Some(first) = details.first() else {
        return Vec::new();
    };
    let contract_id = first.contract.contract_id;

    let codes: Vec<&str> = providers.iter().map(|(code, _)| code.as_str()).collect();
    let now = time::OffsetDateTime::now_utc();
    let since = now - time::Duration::days(2);

    let subscription = match client
        .historical_news(contract_id, &codes, since, now, limit)
        .await
    {
        Ok(subscription) => subscription,
        Err(error) => {
            tracing::warn!(%error, "historical news refused");
            return Vec::new();
        }
    };

    let mut items = Vec::new();
    let mut stream = subscription.filter_data();
    while let Some(Ok(article)) = stream.next().await {
        items.push(NewsItem {
            provider: article.provider_code.clone(),
            article_id: article.article_id.clone(),
            headline: article.headline.clone(),
            timestamp: clock.now(),
        });
    }

    items
}

/// Subscribes to every news feed the account holds, plus the bulletins.
///
/// The provider list is asked for rather than assumed: entitlements differ per
/// account, and requesting a feed we do not hold returns an error that reads
/// like a fault. Each provider gets its own task so one failing feed cannot
/// silence the others.
pub async fn spawn_provider_streams(
    client: Arc<Client>,
    clock: Arc<dyn TradingClock>,
    tx: mpsc::Sender<NewsEvent>,
) -> Vec<String> {
    let providers = available_providers(&client).await;
    let mut subscribed = Vec::new();

    for (code, name) in providers {
        let subscription = match client.broad_tape_news(&code).await {
            Ok(subscription) => subscription,
            Err(error) => {
                tracing::warn!(%code, %name, %error, "news feed refused");
                continue;
            }
        };

        let label = name.clone();
        let tx = tx.clone();
        let clock = clock.clone();
        let connection = client.clone();
        subscribed.push(code.clone());

        tokio::spawn(async move {
            let _connection = connection;
            let mut stream = subscription.filter_data();

            while let Some(update) = stream.next().await {
                let article = match update {
                    Ok(article) => article,
                    Err(error) => {
                        tracing::warn!(%code, %error, "news feed error");
                        continue;
                    }
                };

                let item = NewsItem {
                    provider: label.clone(),
                    article_id: article.article_id.clone(),
                    headline: article.headline.clone(),
                    timestamp: clock.now(),
                };

                if tx.send(NewsEvent::News(item)).await.is_err() {
                    break;
                }
            }
        });
    }

    subscribed
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
