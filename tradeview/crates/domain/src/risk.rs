use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskRejectionReason {
    InvalidQuantity,
    QuantityAboveLimit,
    NotionalAboveLimit,
    InsufficientCapital,
    DailyLossLimitReached,
    MaxOpenPositionsReached,
    MarketClosed,
    OutsideTradingWindow,
    CircuitBreakerOpen,
    StaleMarketData,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "decision", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskDecision {
    Accepted,
    Rejected {
        reason: RiskRejectionReason,
        detail: String,
    },
}

impl RiskDecision {
    pub fn rejected(reason: RiskRejectionReason, detail: impl Into<String>) -> Self {
        Self::Rejected {
            reason,
            detail: detail.into(),
        }
    }

    pub fn is_accepted(&self) -> bool {
        matches!(self, RiskDecision::Accepted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_rejection_carries_a_machine_readable_reason_alongside_its_detail() {
        let decision = RiskDecision::rejected(
            RiskRejectionReason::DailyLossLimitReached,
            "daily loss 2100 exceeds limit 2000",
        );
        assert!(!decision.is_accepted());

        let json = serde_json::to_value(&decision).unwrap();
        assert_eq!(json["decision"], "REJECTED");
        assert_eq!(json["reason"], "DAILY_LOSS_LIMIT_REACHED");
    }

    #[test]
    fn acceptance_is_explicit_in_the_wire_format() {
        let json = serde_json::to_value(RiskDecision::Accepted).unwrap();
        assert_eq!(json["decision"], "ACCEPTED");
    }
}
