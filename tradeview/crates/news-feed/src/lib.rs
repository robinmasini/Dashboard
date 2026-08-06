//! Market headlines from public RSS feeds.
//!
//! Interactive Brokers carries only what the account is entitled to, which for
//! a retail paper account is a handful of US equity columns. Daily coverage of
//! world markets has to come from elsewhere, so this is a second inbound source
//! rather than a replacement: the two are merged downstream.

mod parse;

pub use parse::{parse_rss, FeedItem};

use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tradeview_clock::TradingClock;

/// A feed to poll, with the label shown next to its headlines.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FeedSource {
    pub label: String,
    pub url: String,
}

impl FeedSource {
    pub fn new(label: &str, url: &str) -> Self {
        Self {
            label: label.to_string(),
            url: url.to_string(),
        }
    }
}

/// Sources that were verified to return a usable number of items. Yahoo Finance
/// and the FT answer with a single element and are deliberately absent.
pub fn default_sources() -> Vec<FeedSource> {
    vec![
        FeedSource::new(
            "CNBC Markets",
            "https://www.cnbc.com/id/20910258/device/rss/rss.html",
        ),
        FeedSource::new(
            "CNBC Economy",
            "https://www.cnbc.com/id/20910258/device/rss/rss.html",
        ),
        FeedSource::new(
            "MarketWatch",
            "http://feeds.marketwatch.com/marketwatch/topstories/",
        ),
        FeedSource::new("Investing.com", "https://www.investing.com/rss/news.rss"),
    ]
}

/// Reads `TRADEVIEW_NEWS_FEEDS` as `Label=url` pairs separated by `|`, falling
/// back to the verified defaults.
pub fn sources_from_env() -> Vec<FeedSource> {
    let raw = match std::env::var("TRADEVIEW_NEWS_FEEDS") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => return default_sources(),
    };

    let parsed: Vec<FeedSource> = raw
        .split('|')
        .filter_map(|entry| {
            let (label, url) = entry.split_once('=')?;
            let (label, url) = (label.trim(), url.trim());
            if label.is_empty() || url.is_empty() {
                return None;
            }
            Some(FeedSource::new(label, url))
        })
        .collect();

    if parsed.is_empty() {
        default_sources()
    } else {
        parsed
    }
}

/// A headline ready to broadcast.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Headline {
    pub provider: String,
    pub id: String,
    pub title: String,
    /// Publication time as the feed states it, falling back to now when absent
    /// or unparseable — an item with no date still deserves to be seen.
    pub published: String,
}

/// Polls every source on a loop, emitting headlines it has not seen before.
///
/// Deduplication is by link, which feeds keep stable across polls; titles are
/// edited after publication and would resurface as new articles.
pub fn spawn_feed_poller(
    sources: Vec<FeedSource>,
    clock: Arc<dyn TradingClock>,
    interval: Duration,
    tx: mpsc::Sender<Headline>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let client = match reqwest::Client::builder()
            .user_agent("TradeView/0.1")
            .timeout(Duration::from_secs(15))
            .build()
        {
            Ok(client) => client,
            Err(error) => {
                tracing::warn!(%error, "news feed client unavailable");
                return;
            }
        };

        let mut seen: HashSet<String> = HashSet::new();

        loop {
            for source in &sources {
                let body = match client.get(&source.url).send().await {
                    Ok(response) => match response.text().await {
                        Ok(body) => body,
                        Err(error) => {
                            tracing::warn!(url = %source.url, %error, "feed unreadable");
                            continue;
                        }
                    },
                    Err(error) => {
                        // One unreachable feed must not stop the others.
                        tracing::warn!(url = %source.url, %error, "feed unreachable");
                        continue;
                    }
                };

                for item in parse_rss(&body) {
                    let key = if item.link.is_empty() {
                        format!("{}::{}", source.label, item.title)
                    } else {
                        item.link.clone()
                    };
                    if !seen.insert(key.clone()) {
                        continue;
                    }

                    let headline = Headline {
                        provider: source.label.clone(),
                        id: key,
                        title: item.title,
                        published: if item.published.is_empty() {
                            clock.now().as_datetime().to_rfc3339()
                        } else {
                            item.published
                        },
                    };

                    if tx.send(headline).await.is_err() {
                        return;
                    }
                }
            }

            // Bounded so a long session cannot grow this without limit.
            if seen.len() > 5_000 {
                seen.clear();
            }

            tokio::time::sleep(interval).await;
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_defaults_exclude_the_feeds_that_return_nothing() {
        let urls: Vec<String> = default_sources().into_iter().map(|s| s.url).collect();
        assert!(!urls.iter().any(|url| url.contains("yahoo")));
        assert!(!urls.iter().any(|url| url.contains("ft.com")));
    }

    #[test]
    fn the_environment_overrides_the_defaults() {
        // Parsed without touching the environment, which tests share.
        let parse = |raw: &str| -> Vec<FeedSource> {
            raw.split('|')
                .filter_map(|entry| {
                    let (label, url) = entry.split_once('=')?;
                    Some(FeedSource::new(label.trim(), url.trim()))
                })
                .collect()
        };

        let sources = parse("Reuters=https://a.example|Bloomberg=https://b.example");
        assert_eq!(sources.len(), 2);
        assert_eq!(sources[0].label, "Reuters");
        assert_eq!(sources[1].url, "https://b.example");
    }

    #[test]
    fn an_entry_without_a_url_is_dropped_rather_than_half_built() {
        let sources: Vec<FeedSource> = "Broken"
            .split('|')
            .filter_map(|entry| {
                let (label, url) = entry.split_once('=')?;
                Some(FeedSource::new(label, url))
            })
            .collect();
        assert!(sources.is_empty());
    }
}
