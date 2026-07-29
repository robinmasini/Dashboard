use crate::ids::{BrokerOrderId, ClientOrderId, ExecutionId, InstrumentId, PositionId};
use crate::money::{Money, Price, Quantity};
use crate::time::Timestamp;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderSide {
    Buy,
    Sell,
}

impl OrderSide {
    pub fn opposite(&self) -> Self {
        match self {
            OrderSide::Buy => OrderSide::Sell,
            OrderSide::Sell => OrderSide::Buy,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderType {
    Market,
    Limit,
    Stop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderStatus {
    Created,
    RiskAccepted,
    Sent,
    Acknowledged,
    PartiallyFilled,
    Filled,
    RiskRejected,
    BrokerRejected,
    CancelPending,
    Cancelled,
    Expired,
    Unknown,
}

impl OrderStatus {
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            OrderStatus::Filled
                | OrderStatus::RiskRejected
                | OrderStatus::BrokerRejected
                | OrderStatus::Cancelled
                | OrderStatus::Expired
        )
    }

    pub fn is_live_at_broker(&self) -> bool {
        matches!(
            self,
            OrderStatus::Sent
                | OrderStatus::Acknowledged
                | OrderStatus::PartiallyFilled
                | OrderStatus::CancelPending
        )
    }

    pub fn can_transition_to(&self, next: OrderStatus) -> bool {
        use OrderStatus::*;

        if next == Unknown {
            return true;
        }

        match self {
            Created => matches!(next, RiskAccepted | RiskRejected),
            RiskAccepted => matches!(next, Sent | Cancelled),
            Sent => matches!(
                next,
                Acknowledged | BrokerRejected | PartiallyFilled | Filled | Cancelled | Expired
            ),
            Acknowledged => matches!(
                next,
                PartiallyFilled | Filled | CancelPending | Cancelled | Expired | BrokerRejected
            ),
            PartiallyFilled => matches!(
                next,
                PartiallyFilled | Filled | CancelPending | Cancelled | Expired
            ),
            CancelPending => matches!(next, Cancelled | Filled | PartiallyFilled | Expired),
            Unknown => true,
            Filled | RiskRejected | BrokerRejected | Cancelled | Expired => false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlaceOrderCommand {
    pub client_order_id: ClientOrderId,
    pub instrument: InstrumentId,
    pub side: OrderSide,
    pub order_type: OrderType,
    pub price: Option<Price>,
    pub quantity: Quantity,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OrderRecord {
    pub client_order_id: ClientOrderId,
    pub broker_order_id: Option<BrokerOrderId>,
    pub instrument: InstrumentId,
    pub side: OrderSide,
    pub order_type: OrderType,
    pub price: Option<Price>,
    pub quantity: Quantity,
    pub filled_quantity: Quantity,
    pub status: OrderStatus,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

impl OrderRecord {
    pub fn remaining_quantity(&self) -> Quantity {
        self.quantity
            .checked_sub(self.filled_quantity)
            .unwrap_or(Quantity::ZERO)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExecutionRecord {
    pub execution_id: ExecutionId,
    pub client_order_id: ClientOrderId,
    pub instrument: InstrumentId,
    pub side: OrderSide,
    pub price: Price,
    pub quantity: Quantity,
    pub commission: Money,
    pub timestamp: Timestamp,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PositionRecord {
    pub position_id: PositionId,
    pub instrument: InstrumentId,
    pub side: OrderSide,
    pub quantity: Quantity,
    pub entry_price: Price,
    pub current_price: Price,
    pub unrealized_pnl: Money,
    pub realized_pnl: Money,
    pub opened_at: Timestamp,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn terminal_states_accept_no_further_transition() {
        for terminal in [
            OrderStatus::Filled,
            OrderStatus::RiskRejected,
            OrderStatus::BrokerRejected,
            OrderStatus::Cancelled,
            OrderStatus::Expired,
        ] {
            assert!(terminal.is_terminal());
            assert!(!terminal.can_transition_to(OrderStatus::Sent));
            assert!(!terminal.can_transition_to(OrderStatus::Filled));
        }
    }

    #[test]
    fn an_order_cannot_reach_the_broker_without_passing_risk() {
        assert!(!OrderStatus::Created.can_transition_to(OrderStatus::Sent));
        assert!(OrderStatus::Created.can_transition_to(OrderStatus::RiskAccepted));
        assert!(OrderStatus::RiskAccepted.can_transition_to(OrderStatus::Sent));
    }

    #[test]
    fn partial_fills_may_repeat_before_completing() {
        assert!(OrderStatus::PartiallyFilled.can_transition_to(OrderStatus::PartiallyFilled));
        assert!(OrderStatus::PartiallyFilled.can_transition_to(OrderStatus::Filled));
    }

    #[test]
    fn unknown_is_reachable_from_anywhere_so_reconciliation_can_flag_divergence() {
        assert!(OrderStatus::Filled.can_transition_to(OrderStatus::Unknown));
        assert!(OrderStatus::Created.can_transition_to(OrderStatus::Unknown));
    }

    #[test]
    fn order_side_opposite_round_trips() {
        assert_eq!(OrderSide::Buy.opposite(), OrderSide::Sell);
        assert_eq!(OrderSide::Buy.opposite().opposite(), OrderSide::Buy);
    }

    #[test]
    fn order_status_keeps_its_screaming_snake_wire_format() {
        assert_eq!(
            serde_json::to_string(&OrderStatus::PartiallyFilled).unwrap(),
            r#""PARTIALLY_FILLED""#
        );
        assert_eq!(
            serde_json::to_string(&OrderStatus::RiskAccepted).unwrap(),
            r#""RISK_ACCEPTED""#
        );
    }
}
