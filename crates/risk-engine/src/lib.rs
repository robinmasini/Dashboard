use rust_decimal::Decimal;
use tradeview_domain::{Money, PlaceOrderCommand, Quantity, RiskDecision, RiskRejectionReason};

pub struct RiskEngine {
    max_quantity_per_order: Quantity,
}

impl RiskEngine {
    pub fn default_rules() -> Self {
        Self {
            max_quantity_per_order: Quantity::new(Decimal::from(10_000)).expect("positive"),
        }
    }

    pub fn evaluate(&self, command: &PlaceOrderCommand, current_capital: Money) -> RiskDecision {
        if command.quantity.is_zero() {
            return RiskDecision::rejected(
                RiskRejectionReason::InvalidQuantity,
                "order quantity must be greater than zero",
            );
        }

        if command.quantity > self.max_quantity_per_order {
            return RiskDecision::rejected(
                RiskRejectionReason::QuantityAboveLimit,
                format!(
                    "quantity {} exceeds the per-order limit of {}",
                    command.quantity, self.max_quantity_per_order
                ),
            );
        }

        if current_capital.value() <= Decimal::ZERO {
            return RiskDecision::rejected(
                RiskRejectionReason::InsufficientCapital,
                format!("capital {current_capital} leaves no room for new positions"),
            );
        }

        RiskDecision::Accepted
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tradeview_domain::{ClientOrderId, InstrumentId, OrderSide, OrderType};

    fn command(quantity: i64) -> PlaceOrderCommand {
        PlaceOrderCommand {
            client_order_id: ClientOrderId::new("C-1"),
            instrument: InstrumentId::new("NVDA"),
            side: OrderSide::Buy,
            order_type: OrderType::Market,
            price: None,
            quantity: Quantity::new(Decimal::from(quantity)).unwrap(),
        }
    }

    fn capital(value: i64) -> Money {
        Money::new(Decimal::from(value))
    }

    fn reason(decision: RiskDecision) -> RiskRejectionReason {
        match decision {
            RiskDecision::Rejected { reason, .. } => reason,
            RiskDecision::Accepted => panic!("expected a rejection"),
        }
    }

    #[test]
    fn a_reasonable_order_against_funded_capital_is_accepted() {
        let decision = RiskEngine::default_rules().evaluate(&command(100), capital(100_000));
        assert!(decision.is_accepted());
    }

    #[test]
    fn a_zero_quantity_order_is_rejected() {
        let decision = RiskEngine::default_rules().evaluate(&command(0), capital(100_000));
        assert_eq!(reason(decision), RiskRejectionReason::InvalidQuantity);
    }

    #[test]
    fn an_order_above_the_size_limit_is_rejected() {
        let decision = RiskEngine::default_rules().evaluate(&command(10_001), capital(100_000));
        assert_eq!(reason(decision), RiskRejectionReason::QuantityAboveLimit);
    }

    #[test]
    fn trading_is_refused_once_capital_is_exhausted() {
        let decision = RiskEngine::default_rules().evaluate(&command(10), capital(0));
        assert_eq!(reason(decision), RiskRejectionReason::InsufficientCapital);

        let decision = RiskEngine::default_rules().evaluate(&command(10), capital(-1));
        assert_eq!(reason(decision), RiskRejectionReason::InsufficientCapital);
    }
}
