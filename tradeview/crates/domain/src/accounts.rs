use crate::ids::AccountId;
use crate::money::Money;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EnvMode {
    Live,
    Demo,
    Sim,
}

impl EnvMode {
    pub fn is_real_money(&self) -> bool {
        matches!(self, EnvMode::Live)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AccountSnapshot {
    pub account_id: AccountId,
    pub env_mode: EnvMode,
    pub broker: String,
    pub currency: String,
    pub initial_capital: Money,
    pub current_capital: Money,
    pub realized_pnl: Money,
    pub unrealized_pnl: Money,
    pub is_active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AccountState {
    pub account_id: AccountId,
    pub initial_capital: Money,
    pub current_capital: Money,
    pub realized_pnl: Money,
    pub unrealized_pnl: Money,
    pub open_positions_count: usize,
    pub total_trades_count: usize,
    pub winning_trades_count: usize,
    pub losing_trades_count: usize,
}

impl AccountState {
    pub fn new(account_id: AccountId, initial_capital: Money) -> Self {
        Self {
            account_id,
            initial_capital,
            current_capital: initial_capital,
            realized_pnl: Money::ZERO,
            unrealized_pnl: Money::ZERO,
            open_positions_count: 0,
            total_trades_count: 0,
            winning_trades_count: 0,
            losing_trades_count: 0,
        }
    }

    pub fn equity(&self) -> Money {
        self.current_capital + self.unrealized_pnl
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;

    #[test]
    fn only_live_is_treated_as_real_money() {
        assert!(EnvMode::Live.is_real_money());
        assert!(!EnvMode::Demo.is_real_money());
        assert!(!EnvMode::Sim.is_real_money());
    }

    #[test]
    fn a_fresh_account_starts_flat_at_its_initial_capital() {
        let state = AccountState::new(
            AccountId::new("U15525670"),
            Money::new(Decimal::from(100_000)),
        );
        assert_eq!(state.current_capital, state.initial_capital);
        assert_eq!(state.realized_pnl, Money::ZERO);
        assert_eq!(state.equity(), Money::new(Decimal::from(100_000)));
    }

    #[test]
    fn equity_includes_open_position_pnl() {
        let mut state =
            AccountState::new(AccountId::new("SIM-1"), Money::new(Decimal::from(10_000)));
        state.unrealized_pnl = Money::new(Decimal::from(-250));
        assert_eq!(state.equity(), Money::new(Decimal::from(9_750)));
    }
}
