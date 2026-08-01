use crate::{BrokerAdapter, CapabilityMatrix, MarketDataProvider};
use async_trait::async_trait;
use std::sync::Mutex;
use tokio::sync::mpsc::{self, Receiver};
use tradeview_common::{Result, TradeViewError};
use tradeview_domain::{
    AccountSnapshot, BrokerOrderId, ClientOrderId, EnvMode, InstrumentId, MarketDataMode,
    MarketEvent, OrderRecord, PlaceOrderCommand, PositionRecord,
};

/// A broker that fills nothing and simply records what it was asked to do, so
/// the engine can be tested without any exchange behaviour in the way.
pub struct RecordingBroker {
    capabilities: CapabilityMatrix,
    placed: Mutex<Vec<PlaceOrderCommand>>,
    cancelled: Mutex<Vec<ClientOrderId>>,
    account: AccountSnapshot,
    reject_with: Option<String>,
}

impl RecordingBroker {
    pub fn new(account: AccountSnapshot) -> Self {
        Self {
            capabilities: CapabilityMatrix::simulation_default(EnvMode::Sim),
            placed: Mutex::new(Vec::new()),
            cancelled: Mutex::new(Vec::new()),
            account,
            reject_with: None,
        }
    }

    pub fn rejecting(account: AccountSnapshot, reason: impl Into<String>) -> Self {
        Self {
            reject_with: Some(reason.into()),
            ..Self::new(account)
        }
    }

    pub fn with_capabilities(mut self, capabilities: CapabilityMatrix) -> Self {
        self.capabilities = capabilities;
        self
    }

    pub fn placed_orders(&self) -> Vec<PlaceOrderCommand> {
        self.placed.lock().unwrap().clone()
    }

    pub fn cancelled_orders(&self) -> Vec<ClientOrderId> {
        self.cancelled.lock().unwrap().clone()
    }
}

#[async_trait]
impl BrokerAdapter for RecordingBroker {
    fn capabilities(&self) -> CapabilityMatrix {
        self.capabilities.clone()
    }

    async fn place_order(&self, command: &PlaceOrderCommand) -> Result<BrokerOrderId> {
        if let Some(reason) = &self.reject_with {
            return Err(TradeViewError::Broker(reason.clone()));
        }
        let mut placed = self.placed.lock().unwrap();
        placed.push(command.clone());
        Ok(BrokerOrderId::new(format!("BROKER-{}", placed.len())))
    }

    async fn cancel_order(&self, client_order_id: &ClientOrderId) -> Result<()> {
        self.cancelled.lock().unwrap().push(client_order_id.clone());
        Ok(())
    }

    async fn open_orders(&self) -> Result<Vec<OrderRecord>> {
        Ok(Vec::new())
    }

    async fn positions(&self) -> Result<Vec<PositionRecord>> {
        Ok(Vec::new())
    }

    async fn account(&self) -> Result<AccountSnapshot> {
        Ok(self.account.clone())
    }
}

/// A market data provider that replays a fixed script of events.
pub struct ScriptedMarketData {
    events: Vec<MarketEvent>,
    mode: MarketDataMode,
    max_subscriptions: Option<usize>,
}

impl ScriptedMarketData {
    pub fn new(events: Vec<MarketEvent>) -> Self {
        Self {
            events,
            mode: MarketDataMode::Synthetic,
            max_subscriptions: None,
        }
    }

    pub fn with_max_subscriptions(mut self, max: usize) -> Self {
        self.max_subscriptions = Some(max);
        self
    }
}

#[async_trait]
impl MarketDataProvider for ScriptedMarketData {
    fn mode(&self) -> MarketDataMode {
        self.mode
    }

    fn max_subscriptions(&self) -> Option<usize> {
        self.max_subscriptions
    }

    async fn subscribe(&self, instruments: &[InstrumentId]) -> Result<Receiver<MarketEvent>> {
        if let Some(max) = self.max_subscriptions {
            if instruments.len() > max {
                return Err(TradeViewError::MarketData(format!(
                    "requested {} subscriptions, provider allows {max}",
                    instruments.len()
                )));
            }
        }

        let (tx, rx) = mpsc::channel(self.events.len().max(1));
        for event in &self.events {
            tx.send(event.clone())
                .await
                .map_err(|e| TradeViewError::MarketData(e.to_string()))?;
        }
        Ok(rx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;
    use tradeview_domain::{
        AccountId, MarketStatus, Money, OrderSide, OrderType, Quantity, Timestamp,
    };

    fn account() -> AccountSnapshot {
        AccountSnapshot {
            account_id: AccountId::new("SIM-1"),
            env_mode: EnvMode::Sim,
            broker: "mock".to_string(),
            currency: "EUR".to_string(),
            initial_capital: Money::new(Decimal::from(100_000)),
            current_capital: Money::new(Decimal::from(100_000)),
            realized_pnl: Money::ZERO,
            unrealized_pnl: Money::ZERO,
            is_active: true,
        }
    }

    fn buy_order(id: &str) -> PlaceOrderCommand {
        PlaceOrderCommand {
            client_order_id: ClientOrderId::new(id),
            instrument: InstrumentId::new("NVDA"),
            side: OrderSide::Buy,
            order_type: OrderType::Market,
            price: None,
            quantity: Quantity::new(Decimal::from(10)).unwrap(),
        }
    }

    #[tokio::test]
    async fn the_recording_broker_captures_what_the_engine_sent() {
        let broker = RecordingBroker::new(account());
        broker.place_order(&buy_order("C-1")).await.unwrap();
        broker.place_order(&buy_order("C-2")).await.unwrap();
        broker
            .cancel_order(&ClientOrderId::new("C-1"))
            .await
            .unwrap();

        let placed = broker.placed_orders();
        assert_eq!(placed.len(), 2);
        assert_eq!(placed[0].client_order_id, ClientOrderId::new("C-1"));
        assert_eq!(broker.cancelled_orders(), vec![ClientOrderId::new("C-1")]);
    }

    #[tokio::test]
    async fn a_rejecting_broker_surfaces_the_failure_instead_of_an_order_id() {
        let broker = RecordingBroker::rejecting(account(), "no route to venue");
        let error = broker.place_order(&buy_order("C-1")).await.unwrap_err();
        assert!(matches!(error, TradeViewError::Broker(_)));
        assert!(broker.placed_orders().is_empty());
    }

    #[tokio::test]
    async fn scripted_market_data_replays_its_events_in_order() {
        let status = MarketEvent::Status(MarketStatus {
            mode: MarketDataMode::Synthetic,
            active_symbol: InstrumentId::new("NVDA"),
            connected: true,
            feed_running: true,
            events_received: 1,
            events_lost: 0,
            estimated_delay_ms: 0,
            last_timestamp: Timestamp::from_nanos(0),
        });
        let provider = ScriptedMarketData::new(vec![status.clone(), status.clone()]);

        let mut rx = provider
            .subscribe(&[InstrumentId::new("NVDA")])
            .await
            .unwrap();

        assert_eq!(rx.recv().await.unwrap(), status);
        assert_eq!(rx.recv().await.unwrap(), status);
    }

    #[tokio::test]
    async fn subscribing_beyond_the_provider_limit_fails_loudly() {
        let provider = ScriptedMarketData::new(Vec::new()).with_max_subscriptions(1);
        let error = provider
            .subscribe(&[InstrumentId::new("NVDA"), InstrumentId::new("AAPL")])
            .await
            .unwrap_err();
        assert!(matches!(error, TradeViewError::MarketData(_)));
    }
}
