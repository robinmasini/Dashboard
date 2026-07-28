use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct InstrumentId(pub String);

impl InstrumentId {
    pub fn new(symbol: &str) -> Self {
        Self(symbol.to_uppercase())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum MarketDataMode {
    REALTIME,
    DELAYED,
    FROZEN,
    REPLAY,
    SYNTHETIC,
    UNKNOWN,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrderSide {
    BUY,
    SELL,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrderType {
    MARKET,
    LIMIT,
    STOP,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrderStatus {
    CREATED,
    RISK_ACCEPTED,
    SENT,
    ACKNOWLEDGED,
    PARTIALLY_FILLED,
    FILLED,
    RISK_REJECTED,
    BROKER_REJECTED,
    CANCEL_PENDING,
    CANCELLED,
    EXPIRED,
    UNKNOWN,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeTick {
    pub sequence_number: u64,
    pub instrument: InstrumentId,
    pub price: Decimal,
    pub quantity: Decimal,
    pub side: OrderSide,
    pub source_timestamp: DateTime<Utc>,
    pub received_timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quote {
    pub sequence_number: u64,
    pub instrument: InstrumentId,
    pub bid_price: Decimal,
    pub bid_size: Decimal,
    pub ask_price: Decimal,
    pub ask_size: Decimal,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Timeframe {
    S1,
    S5,
    S15,
    M1,
    M5,
}

impl Timeframe {
    pub fn as_seconds(&self) -> i64 {
        match self {
            Timeframe::S1 => 1,
            Timeframe::S5 => 5,
            Timeframe::S15 => 15,
            Timeframe::M1 => 60,
            Timeframe::M5 => 300,
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            Timeframe::S1 => "1s",
            Timeframe::S5 => "5s",
            Timeframe::S15 => "15s",
            Timeframe::M1 => "1m",
            Timeframe::M5 => "5m",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Candle {
    pub instrument: InstrumentId,
    pub timeframe: Timeframe,
    pub open: Decimal,
    pub high: Decimal,
    pub low: Decimal,
    pub close: Decimal,
    pub volume: Decimal,
    pub open_time: DateTime<Utc>,
    pub close_time: DateTime<Utc>,
    pub ticks_count: u64,
    pub is_closed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketStatus {
    pub mode: MarketDataMode,
    pub active_symbol: InstrumentId,
    pub connected: bool,
    pub events_received: u64,
    pub events_lost: u64,
    pub estimated_delay_ms: i64,
    pub last_timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum MarketEvent {
    Tick(TradeTick),
    Quote(Quote),
    Candle(Candle),
    Status(MarketStatus),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountSnapshot {
    pub account_id: String,
    pub env_mode: String, // LIVE (Disabled), DEMO, SIM
    pub broker: String,
    pub currency: String,
    pub initial_capital: Decimal,
    pub current_capital: Decimal,
    pub realized_pnl: Decimal,
    pub unrealized_pnl: Decimal,
    pub is_active: bool,
}
