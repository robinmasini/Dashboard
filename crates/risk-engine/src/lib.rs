use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use tradeview_oms::PlaceOrderCommand;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskCheckResult {
    Accepted,
    Rejected(String),
}

pub struct RiskEngine {
    max_quantity_per_order: Decimal,
    max_daily_loss: Decimal,
}

impl RiskEngine {
    pub fn default_rules() -> Self {
        Self {
            max_quantity_per_order: Decimal::from(10_000),
            max_daily_loss: Decimal::from(20_000),
        }
    }

    pub fn evaluate(&self, command: &PlaceOrderCommand, current_capital: Decimal) -> RiskCheckResult {
        if command.quantity <= Decimal::ZERO {
            return RiskCheckResult::Rejected("Order quantity must be greater than zero".to_string());
        }

        if command.quantity > self.max_quantity_per_order {
            return RiskCheckResult::Rejected(format!(
                "Order quantity {} exceeds max limit of {}",
                command.quantity, self.max_quantity_per_order
            ));
        }

        if current_capital <= Decimal::ZERO {
            return RiskCheckResult::Rejected("Insufficient capital for new positions".to_string());
        }

        RiskCheckResult::Accepted
    }
}
