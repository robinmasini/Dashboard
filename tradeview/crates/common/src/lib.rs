use thiserror::Error;

#[derive(Debug, Error)]
pub enum TradeViewError {
    #[error("invalid value for {field}: {reason}")]
    Invalid { field: &'static str, reason: String },

    #[error("broker error: {0}")]
    Broker(String),

    #[error("market data error: {0}")]
    MarketData(String),

    #[error("not supported by this adapter: {0}")]
    Unsupported(&'static str),
}

impl TradeViewError {
    pub fn invalid(field: &'static str, reason: impl Into<String>) -> Self {
        Self::Invalid {
            field,
            reason: reason.into(),
        }
    }
}

pub type Result<T> = std::result::Result<T, TradeViewError>;
