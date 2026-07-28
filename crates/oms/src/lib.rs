use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use tradeview_domain::{InstrumentId, OrderSide, OrderStatus, OrderType};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaceOrderCommand {
    pub client_order_id: String,
    pub instrument: InstrumentId,
    pub side: OrderSide,
    pub order_type: OrderType,
    pub price: Option<Decimal>,
    pub quantity: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderRecord {
    pub client_order_id: String,
    pub broker_order_id: Option<String>,
    pub instrument: InstrumentId,
    pub side: OrderSide,
    pub order_type: OrderType,
    pub price: Decimal,
    pub quantity: Decimal,
    pub filled_quantity: Decimal,
    pub status: OrderStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionRecord {
    pub position_id: String,
    pub instrument: InstrumentId,
    pub side: OrderSide,
    pub quantity: Decimal,
    pub entry_price: Decimal,
    pub current_price: Decimal,
    pub unrealized_pnl: Decimal,
    pub realized_pnl: Decimal,
    pub opened_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRecord {
    pub execution_id: String,
    pub client_order_id: String,
    pub instrument: InstrumentId,
    pub side: OrderSide,
    pub price: Decimal,
    pub quantity: Decimal,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountState {
    pub account_id: String,
    pub initial_capital: Decimal,
    pub current_capital: Decimal,
    pub realized_pnl: Decimal,
    pub unrealized_pnl: Decimal,
    pub open_positions_count: usize,
    pub total_trades_count: usize,
    pub winning_trades_count: usize,
    pub losing_trades_count: usize,
}

impl AccountState {
    pub fn new(account_id: &str, initial_capital: Decimal) -> Self {
        Self {
            account_id: account_id.to_string(),
            initial_capital,
            current_capital: initial_capital,
            realized_pnl: Decimal::ZERO,
            unrealized_pnl: Decimal::ZERO,
            open_positions_count: 0,
            total_trades_count: 0,
            winning_trades_count: 0,
            losing_trades_count: 0,
        }
    }
}
