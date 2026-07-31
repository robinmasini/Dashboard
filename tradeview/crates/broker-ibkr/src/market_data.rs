use crate::config::IbkrConfig;
use crate::contract::front_quarter;
use ibapi::contracts::Contract;
use ibapi::prelude::*;
use rust_decimal::Decimal;
use std::sync::Arc;
use tokio::sync::mpsc::{self, Receiver};
use tokio_stream::StreamExt;
use tradeview_clock::TradingClock;
use tradeview_common::{Result, TradeViewError};
use tradeview_domain::{
    InstrumentId, MarketDataMode, MarketEvent, Price, Quantity, Quote, SequenceNumber,
};

/// Interactive Brokers caps how many instruments may stream at once. The
/// allowance rises with commissions and equity, but never approaches the 503
/// constituents, which is why market data stays a separate port from execution.
const DEFAULT_MAX_SUBSCRIPTIONS: usize = 100;

/// CME symbol for the Micro E-mini S&P 500.
pub const MICRO_ES: &str = "MES";

pub struct IbkrMarketData {
    config: IbkrConfig,
    clock: Arc<dyn TradingClock>,
}

impl IbkrMarketData {
    pub fn new(config: IbkrConfig, clock: Arc<dyn TradingClock>) -> Self {
        Self { config, clock }
    }

    /// Opens the session, turning the library's failures into errors that name
    /// the likely cause: a bare "connection refused" sends people hunting in
    /// the wrong place.
    pub async fn connect(&self) -> Result<Client> {
        if let Some(hint) = self.config.port_hint() {
            return Err(TradeViewError::MarketData(format!(
                "{} ({})",
                hint,
                self.config.address()
            )));
        }

        let attempt = tokio::time::timeout(
            std::time::Duration::from_secs(self.config.connect_timeout_secs),
            Client::connect(&self.config.address(), self.config.client_id),
        )
        .await;

        match attempt {
            Err(_) => Err(TradeViewError::MarketData(format!(
                "no answer from {} after {}s — is IB Gateway running, and is \
                 'Enable ActiveX and Socket Clients' ticked?",
                self.config.address(),
                self.config.connect_timeout_secs
            ))),
            Ok(Err(error)) => Err(TradeViewError::MarketData(format!(
                "{} refused the connection: {error} — check the port matches the \
                 running product and that this IP is trusted",
                self.config.address()
            ))),
            Ok(Ok(client)) => Ok(client),
        }
    }

    /// Front-quarter contract for a CME index future, dated from the injected
    /// clock so a replay asks for the contract of its own era.
    pub fn futures_contract(&self, symbol: &str) -> Contract {
        let month = front_quarter(self.clock.now());
        Contract::futures(symbol)
            .expires_in(ibapi::contracts::ContractMonth::new(
                month.year as u16,
                month.month as u8,
            ))
            .on_exchange("CME")
            .in_currency("USD")
            .build()
    }
}

fn to_price(value: f64, field: &'static str) -> Result<Price> {
    let decimal = Decimal::try_from(value)
        .map_err(|_| TradeViewError::invalid(field, format!("unrepresentable price {value}")))?;
    Price::new(decimal)
}

/// Sizes arriving negative or unrepresentable fall back to zero rather than
/// aborting the stream: a bad size must not cost us the quote.
fn to_quantity(value: f64) -> Quantity {
    Decimal::try_from(value)
        .ok()
        .and_then(|decimal| Quantity::new(decimal).ok())
        .unwrap_or(Quantity::ZERO)
}

#[async_trait::async_trait]
impl tradeview_broker_core::MarketDataProvider for IbkrMarketData {
    fn mode(&self) -> MarketDataMode {
        MarketDataMode::Realtime
    }

    fn max_subscriptions(&self) -> Option<usize> {
        Some(DEFAULT_MAX_SUBSCRIPTIONS)
    }

    async fn subscribe(&self, instruments: &[InstrumentId]) -> Result<Receiver<MarketEvent>> {
        if instruments.is_empty() {
            return Err(TradeViewError::invalid(
                "instruments",
                "at least one instrument is required",
            ));
        }
        if instruments.len() > DEFAULT_MAX_SUBSCRIPTIONS {
            return Err(TradeViewError::MarketData(format!(
                "{} instruments requested but Interactive Brokers allows about {}",
                instruments.len(),
                DEFAULT_MAX_SUBSCRIPTIONS
            )));
        }

        let client = Arc::new(self.connect().await?);
        let (tx, rx) = mpsc::channel::<MarketEvent>(1024);

        for instrument in instruments {
            let contract = self.futures_contract(instrument.as_str());
            let client = client.clone();
            let tx = tx.clone();
            let instrument = instrument.clone();
            let clock = self.clock.clone();

            let subscription = client
                .tick_by_tick(&contract, 0)
                .bid_ask(IgnoreSize::No)
                .await
                .map_err(|error| {
                    TradeViewError::MarketData(format!(
                        "{instrument} refused by Interactive Brokers: {error} — a market \
                         data subscription for CME may be missing, or the contract month \
                         may have rolled"
                    ))
                })?;

            tokio::spawn(async move {
                let mut stream = subscription.filter_data();
                let mut sequence: u64 = 0;

                while let Some(update) = stream.next().await {
                    let quote = match update {
                        Ok(quote) => quote,
                        Err(error) => {
                            tracing::warn!(%instrument, %error, "market data stream error");
                            continue;
                        }
                    };

                    let (Ok(bid_price), Ok(ask_price)) = (
                        to_price(quote.bid_price, "bid_price"),
                        to_price(quote.ask_price, "ask_price"),
                    ) else {
                        // A crossed or zero quote is dropped rather than pushed
                        // downstream, where it would poison the spread.
                        tracing::warn!(%instrument, "discarded an unusable quote");
                        continue;
                    };

                    sequence += 1;
                    let event = MarketEvent::Quote(Quote {
                        sequence_number: SequenceNumber::new(sequence),
                        instrument: instrument.clone(),
                        bid_price,
                        bid_size: to_quantity(quote.bid_size),
                        ask_price,
                        ask_size: to_quantity(quote.ask_size),
                        timestamp: clock.now(),
                    });

                    if tx.send(event).await.is_err() {
                        // The consumer is gone: stop rather than spin.
                        break;
                    }
                }
            });
        }

        Ok(rx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tradeview_broker_core::MarketDataProvider;
    use tradeview_clock::SystemClock;

    fn provider() -> IbkrMarketData {
        IbkrMarketData::new(IbkrConfig::default(), Arc::new(SystemClock::new()))
    }

    #[test]
    fn the_provider_reports_a_realtime_mode() {
        assert_eq!(provider().mode(), MarketDataMode::Realtime);
    }

    #[test]
    fn the_subscription_ceiling_is_declared() {
        assert_eq!(provider().max_subscriptions(), Some(100));
    }

    #[tokio::test]
    async fn subscribing_to_nothing_is_rejected_before_any_connection() {
        let error = provider().subscribe(&[]).await.unwrap_err();
        assert!(matches!(error, TradeViewError::Invalid { .. }));
    }

    #[tokio::test]
    async fn asking_for_more_than_ibkr_allows_is_refused_up_front() {
        let many: Vec<InstrumentId> = (0..150)
            .map(|i| InstrumentId::new(&format!("SYM{i}")))
            .collect();
        let error = provider().subscribe(&many).await.unwrap_err();
        let message = error.to_string();
        assert!(message.contains("150"), "the request size must be reported");
    }

    #[tokio::test]
    async fn an_unknown_port_fails_with_the_port_guidance() {
        let config = IbkrConfig {
            port: 9999,
            ..IbkrConfig::default()
        };
        let provider = IbkrMarketData::new(config, Arc::new(SystemClock::new()));
        // Client has no Debug impl, so the error is matched rather than unwrapped.
        let Err(error) = provider.connect().await else {
            panic!("an unknown port must not connect");
        };
        assert!(error.to_string().contains("4002"));
    }
}
