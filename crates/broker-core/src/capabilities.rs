use serde::{Deserialize, Serialize};
use tradeview_domain::{EnvMode, OrderType};

/// What a given adapter can actually do. The engine reads this instead of
/// branching on which broker is plugged in.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CapabilityMatrix {
    pub env_mode: EnvMode,
    pub supported_order_types: Vec<OrderType>,
    pub supports_cancel: bool,
    pub supports_partial_fills: bool,
    pub supports_short_selling: bool,
    pub reports_commissions: bool,
    pub max_market_data_subscriptions: Option<usize>,
    pub max_messages_per_second: Option<u32>,
}

impl CapabilityMatrix {
    pub fn supports(&self, order_type: OrderType) -> bool {
        self.supported_order_types.contains(&order_type)
    }

    pub fn simulation_default(env_mode: EnvMode) -> Self {
        Self {
            env_mode,
            supported_order_types: vec![OrderType::Market, OrderType::Limit, OrderType::Stop],
            supports_cancel: true,
            supports_partial_fills: true,
            supports_short_selling: true,
            reports_commissions: true,
            max_market_data_subscriptions: None,
            max_messages_per_second: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_adapter_advertises_the_order_types_it_accepts() {
        let caps = CapabilityMatrix {
            supported_order_types: vec![OrderType::Market],
            ..CapabilityMatrix::simulation_default(EnvMode::Demo)
        };
        assert!(caps.supports(OrderType::Market));
        assert!(!caps.supports(OrderType::Stop));
    }

    #[test]
    fn broker_throttling_limits_are_expressed_not_assumed() {
        let caps = CapabilityMatrix {
            max_market_data_subscriptions: Some(100),
            max_messages_per_second: Some(50),
            ..CapabilityMatrix::simulation_default(EnvMode::Demo)
        };
        assert_eq!(caps.max_market_data_subscriptions, Some(100));
        assert_eq!(caps.max_messages_per_second, Some(50));
    }
}
