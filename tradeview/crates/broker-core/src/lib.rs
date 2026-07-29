pub mod capabilities;
pub mod testing;

use async_trait::async_trait;
use tokio::sync::mpsc::Receiver;
use tradeview_common::Result;
use tradeview_domain::{
    AccountSnapshot, BrokerOrderId, ClientOrderId, InstrumentId, MarketDataMode, MarketEvent,
    OrderRecord, PlaceOrderCommand, PositionRecord,
};

pub use capabilities::CapabilityMatrix;

/// Outbound port for order execution. The engine never names a broker; it holds
/// one of these.
#[async_trait]
pub trait BrokerAdapter: Send + Sync {
    fn capabilities(&self) -> CapabilityMatrix;

    async fn place_order(&self, command: &PlaceOrderCommand) -> Result<BrokerOrderId>;

    async fn cancel_order(&self, client_order_id: &ClientOrderId) -> Result<()>;

    /// Broker-side truth, used to reconcile after a restart or a disconnect.
    async fn open_orders(&self) -> Result<Vec<OrderRecord>>;

    async fn positions(&self) -> Result<Vec<PositionRecord>>;

    async fn account(&self) -> Result<AccountSnapshot>;
}

/// Outbound port for market data, deliberately separate from execution: the
/// broker that fills orders is not necessarily the source of the 503 feeds.
#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    fn mode(&self) -> MarketDataMode;

    fn max_subscriptions(&self) -> Option<usize>;

    async fn subscribe(&self, instruments: &[InstrumentId]) -> Result<Receiver<MarketEvent>>;
}
