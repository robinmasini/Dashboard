use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tradeview_clock::TradingClock;
use tradeview_domain::{
    AccountId, AccountState, BrokerOrderId, ClientOrderId, ExecutionId, ExecutionRecord,
    InstrumentId, Money, OrderRecord, OrderSide, OrderStatus, PlaceOrderCommand, PositionId,
    PositionRecord, Price, Quantity, Quote, RiskDecision, TradeTick,
};
use tradeview_risk_engine::RiskEngine;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ExecutionEngineEvent {
    AccountUpdated(AccountState),
    OrderStateChanged(OrderRecord),
    PositionUpdated(Vec<PositionRecord>),
    ExecutionOccurred(ExecutionRecord),
    OrderRejected {
        client_order_id: ClientOrderId,
        decision: RiskDecision,
    },
}

pub struct SimExecutionEngine {
    account: AccountState,
    risk_engine: RiskEngine,
    positions: HashMap<InstrumentId, PositionRecord>,
    orders: HashMap<ClientOrderId, OrderRecord>,
    executions: Vec<ExecutionRecord>,
    current_bid: Option<Price>,
    current_ask: Option<Price>,
    next_id: u64,
    clock: Arc<dyn TradingClock>,
}

impl SimExecutionEngine {
    pub fn new(
        account_id: AccountId,
        initial_capital: Money,
        clock: Arc<dyn TradingClock>,
    ) -> Self {
        Self {
            account: AccountState::new(account_id, initial_capital),
            risk_engine: RiskEngine::default_rules(),
            positions: HashMap::new(),
            orders: HashMap::new(),
            executions: Vec::new(),
            current_bid: None,
            current_ask: None,
            next_id: 0,
            clock,
        }
    }

    pub fn account_state(&self) -> AccountState {
        self.account.clone()
    }

    pub fn open_positions(&self) -> Vec<PositionRecord> {
        let mut positions: Vec<_> = self.positions.values().cloned().collect();
        positions.sort_by(|a, b| a.instrument.cmp(&b.instrument));
        positions
    }

    pub fn executions(&self) -> Vec<ExecutionRecord> {
        self.executions.clone()
    }

    pub fn order(&self, client_order_id: &ClientOrderId) -> Option<&OrderRecord> {
        self.orders.get(client_order_id)
    }

    pub fn reset(&mut self) -> Vec<ExecutionEngineEvent> {
        self.account = AccountState::new(
            self.account.account_id.clone(),
            self.account.initial_capital,
        );
        self.positions.clear();
        self.orders.clear();
        self.executions.clear();
        self.next_id = 0;

        vec![
            ExecutionEngineEvent::AccountUpdated(self.account.clone()),
            ExecutionEngineEvent::PositionUpdated(Vec::new()),
        ]
    }

    pub fn on_quote(&mut self, quote: &Quote) -> Vec<ExecutionEngineEvent> {
        self.current_bid = Some(quote.bid_price);
        self.current_ask = Some(quote.ask_price);
        self.refresh_unrealized_pnl()
    }

    pub fn on_tick(&mut self, tick: &TradeTick) -> Vec<ExecutionEngineEvent> {
        if self.current_bid.is_none() {
            self.current_bid = Some(tick.price);
            self.current_ask = Some(tick.price);
        }
        self.refresh_unrealized_pnl()
    }

    pub fn submit_order(&mut self, command: PlaceOrderCommand) -> Vec<ExecutionEngineEvent> {
        let decision = self
            .risk_engine
            .evaluate(&command, self.account.current_capital);
        if !decision.is_accepted() {
            return vec![ExecutionEngineEvent::OrderRejected {
                client_order_id: command.client_order_id,
                decision,
            }];
        }

        let Some(fill_price) = self.fill_price_for(&command) else {
            return vec![ExecutionEngineEvent::OrderRejected {
                client_order_id: command.client_order_id,
                decision: RiskDecision::rejected(
                    tradeview_domain::RiskRejectionReason::StaleMarketData,
                    "no market price available yet",
                ),
            }];
        };

        let now = self.clock.now();
        let mut events = Vec::new();

        let order = OrderRecord {
            client_order_id: command.client_order_id.clone(),
            broker_order_id: Some(BrokerOrderId::new(format!("SIM-{}", self.allocate_id()))),
            instrument: command.instrument.clone(),
            side: command.side,
            order_type: command.order_type,
            price: Some(fill_price),
            quantity: command.quantity,
            filled_quantity: command.quantity,
            status: OrderStatus::Filled,
            created_at: now,
            updated_at: now,
        };
        self.orders
            .insert(command.client_order_id.clone(), order.clone());
        events.push(ExecutionEngineEvent::OrderStateChanged(order));

        let execution = ExecutionRecord {
            execution_id: ExecutionId::new(format!("EXEC-{}", self.allocate_id())),
            client_order_id: command.client_order_id.clone(),
            instrument: command.instrument.clone(),
            side: command.side,
            price: fill_price,
            quantity: command.quantity,
            commission: Money::ZERO,
            timestamp: now,
        };
        self.executions.push(execution.clone());
        events.push(ExecutionEngineEvent::ExecutionOccurred(execution));

        self.apply_to_position(&command, fill_price, now);
        events.extend(self.refresh_unrealized_pnl());
        events
    }

    fn allocate_id(&mut self) -> u64 {
        self.next_id += 1;
        self.next_id
    }

    fn fill_price_for(&self, command: &PlaceOrderCommand) -> Option<Price> {
        match command.side {
            OrderSide::Buy => self.current_ask.or(command.price),
            OrderSide::Sell => self.current_bid.or(command.price),
        }
    }

    fn apply_to_position(
        &mut self,
        command: &PlaceOrderCommand,
        fill_price: Price,
        now: tradeview_domain::Timestamp,
    ) {
        let instrument = command.instrument.clone();

        match self.positions.remove(&instrument) {
            Some(mut position) if position.side == command.side => {
                let total_quantity = position.quantity + command.quantity;
                let total_cost = position.entry_price.notional(position.quantity)
                    + fill_price.notional(command.quantity);
                position.entry_price = Price::new(total_cost.value() / total_quantity.value())
                    .expect("weighted average of positive prices stays positive");
                position.quantity = total_quantity;
                self.positions.insert(instrument, position);
            }
            Some(mut position) => {
                let closed = command.quantity.value().min(position.quantity.value());
                let closed_quantity = Quantity::new(closed).expect("non-negative");
                let pnl = self.realized_pnl_for(&position, fill_price, closed_quantity);
                self.book_realized_pnl(pnl);

                if command.quantity >= position.quantity {
                    let leftover = command
                        .quantity
                        .checked_sub(position.quantity)
                        .expect("checked above");
                    if !leftover.is_zero() {
                        self.positions.insert(
                            instrument,
                            self.new_position(command, fill_price, leftover, now),
                        );
                    }
                } else {
                    position.quantity = position
                        .quantity
                        .checked_sub(command.quantity)
                        .expect("checked above");
                    self.positions.insert(instrument, position);
                }
            }
            None => {
                let position = self.new_position(command, fill_price, command.quantity, now);
                self.positions.insert(instrument, position);
            }
        }
    }

    fn new_position(
        &self,
        command: &PlaceOrderCommand,
        fill_price: Price,
        quantity: Quantity,
        now: tradeview_domain::Timestamp,
    ) -> PositionRecord {
        PositionRecord {
            position_id: PositionId::new(format!("POS-{}-{}", command.instrument, self.next_id)),
            instrument: command.instrument.clone(),
            side: command.side,
            quantity,
            entry_price: fill_price,
            current_price: fill_price,
            unrealized_pnl: Money::ZERO,
            realized_pnl: Money::ZERO,
            opened_at: now,
        }
    }

    fn realized_pnl_for(
        &self,
        position: &PositionRecord,
        exit_price: Price,
        quantity: Quantity,
    ) -> Money {
        match position.side {
            OrderSide::Buy => {
                exit_price.notional(quantity) - position.entry_price.notional(quantity)
            }
            OrderSide::Sell => {
                position.entry_price.notional(quantity) - exit_price.notional(quantity)
            }
        }
    }

    fn book_realized_pnl(&mut self, pnl: Money) {
        self.account.realized_pnl = self.account.realized_pnl + pnl;
        self.account.current_capital = self.account.current_capital + pnl;
        self.account.total_trades_count += 1;
        if pnl.is_negative() {
            self.account.losing_trades_count += 1;
        } else {
            self.account.winning_trades_count += 1;
        }
    }

    fn refresh_unrealized_pnl(&mut self) -> Vec<ExecutionEngineEvent> {
        let bid = self.current_bid;
        let ask = self.current_ask;
        let mut total = Money::ZERO;

        for position in self.positions.values_mut() {
            let mark = match position.side {
                OrderSide::Buy => bid,
                OrderSide::Sell => ask,
            };
            let Some(mark) = mark else { continue };

            position.current_price = mark;
            position.unrealized_pnl = match position.side {
                OrderSide::Buy => {
                    mark.notional(position.quantity)
                        - position.entry_price.notional(position.quantity)
                }
                OrderSide::Sell => {
                    position.entry_price.notional(position.quantity)
                        - mark.notional(position.quantity)
                }
            };
            total = total + position.unrealized_pnl;
        }

        self.account.unrealized_pnl = total;
        self.account.open_positions_count = self.positions.len();

        vec![
            ExecutionEngineEvent::AccountUpdated(self.account.clone()),
            ExecutionEngineEvent::PositionUpdated(self.open_positions()),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;
    use tradeview_clock::VirtualClock;
    use tradeview_domain::{OrderType, SequenceNumber};

    fn engine() -> SimExecutionEngine {
        SimExecutionEngine::new(
            AccountId::new("SIM-1"),
            Money::new(Decimal::from(100_000)),
            Arc::new(VirtualClock::from_nanos(1_700_000_000_000_000_000)),
        )
    }

    fn price(value: i64) -> Price {
        Price::new(Decimal::new(value, 2)).unwrap()
    }

    fn qty(value: i64) -> Quantity {
        Quantity::new(Decimal::from(value)).unwrap()
    }

    fn quote(bid: i64, ask: i64) -> Quote {
        Quote {
            sequence_number: SequenceNumber::new(1),
            instrument: InstrumentId::new("NVDA"),
            bid_price: price(bid),
            bid_size: qty(500),
            ask_price: price(ask),
            ask_size: qty(500),
            timestamp: Timestamp::from_nanos(0),
        }
    }

    fn order(id: &str, side: OrderSide, quantity: i64) -> PlaceOrderCommand {
        PlaceOrderCommand {
            client_order_id: ClientOrderId::new(id),
            instrument: InstrumentId::new("NVDA"),
            side,
            order_type: OrderType::Market,
            price: None,
            quantity: qty(quantity),
        }
    }

    use tradeview_domain::Timestamp;

    #[test]
    fn an_order_before_any_market_data_is_rejected_rather_than_filled_at_zero() {
        let mut engine = engine();
        let events = engine.submit_order(order("C-1", OrderSide::Buy, 10));
        assert!(matches!(
            events.as_slice(),
            [ExecutionEngineEvent::OrderRejected { .. }]
        ));
        assert!(engine.open_positions().is_empty());
    }

    #[test]
    fn a_buy_lifts_the_ask_and_opens_a_long_position() {
        let mut engine = engine();
        engine.on_quote(&quote(21_174, 21_176));
        engine.submit_order(order("C-1", OrderSide::Buy, 10));

        let positions = engine.open_positions();
        assert_eq!(positions.len(), 1);
        assert_eq!(positions[0].side, OrderSide::Buy);
        assert_eq!(positions[0].entry_price, price(21_176));
    }

    #[test]
    fn closing_a_long_at_a_better_price_books_a_win() {
        let mut engine = engine();
        engine.on_quote(&quote(21_174, 21_176));
        engine.submit_order(order("C-1", OrderSide::Buy, 10));

        engine.on_quote(&quote(21_274, 21_276));
        engine.submit_order(order("C-2", OrderSide::Sell, 10));

        let account = engine.account_state();
        assert!(engine.open_positions().is_empty());
        assert_eq!(account.winning_trades_count, 1);
        assert_eq!(account.losing_trades_count, 0);
        // (212.74 - 211.76) * 10
        assert_eq!(account.realized_pnl, Money::new(Decimal::new(980, 2)));
        assert_eq!(
            account.current_capital,
            Money::new(Decimal::new(10_000_980, 2))
        );
    }

    #[test]
    fn closing_a_long_at_a_worse_price_books_a_loss() {
        let mut engine = engine();
        engine.on_quote(&quote(21_174, 21_176));
        engine.submit_order(order("C-1", OrderSide::Buy, 10));

        engine.on_quote(&quote(21_074, 21_076));
        engine.submit_order(order("C-2", OrderSide::Sell, 10));

        let account = engine.account_state();
        assert_eq!(account.losing_trades_count, 1);
        assert_eq!(account.realized_pnl, Money::new(Decimal::new(-1_020, 2)));
    }

    #[test]
    fn adding_to_a_position_averages_the_entry_price() {
        let mut engine = engine();
        engine.on_quote(&quote(19_999, 20_000));
        engine.submit_order(order("C-1", OrderSide::Buy, 10));

        engine.on_quote(&quote(21_999, 22_000));
        engine.submit_order(order("C-2", OrderSide::Buy, 10));

        let positions = engine.open_positions();
        assert_eq!(positions[0].quantity, qty(20));
        assert_eq!(positions[0].entry_price, price(21_000));
    }

    #[test]
    fn selling_more_than_the_open_long_flips_the_position_short() {
        let mut engine = engine();
        engine.on_quote(&quote(21_174, 21_176));
        engine.submit_order(order("C-1", OrderSide::Buy, 10));
        engine.submit_order(order("C-2", OrderSide::Sell, 15));

        let positions = engine.open_positions();
        assert_eq!(positions.len(), 1);
        assert_eq!(positions[0].side, OrderSide::Sell);
        assert_eq!(positions[0].quantity, qty(5));
    }

    #[test]
    fn a_partial_close_leaves_the_remainder_open() {
        let mut engine = engine();
        engine.on_quote(&quote(21_174, 21_176));
        engine.submit_order(order("C-1", OrderSide::Buy, 10));
        engine.submit_order(order("C-2", OrderSide::Sell, 4));

        let positions = engine.open_positions();
        assert_eq!(positions[0].quantity, qty(6));
        assert_eq!(engine.account_state().total_trades_count, 1);
    }

    #[test]
    fn unrealized_pnl_marks_a_long_against_the_bid() {
        let mut engine = engine();
        engine.on_quote(&quote(21_174, 21_176));
        engine.submit_order(order("C-1", OrderSide::Buy, 10));

        engine.on_quote(&quote(21_274, 21_276));
        // (212.74 - 211.76) * 10
        assert_eq!(
            engine.account_state().unrealized_pnl,
            Money::new(Decimal::new(980, 2))
        );
    }

    #[test]
    fn ids_are_allocated_deterministically_not_from_a_random_source() {
        let run = || {
            let mut engine = engine();
            engine.on_quote(&quote(21_174, 21_176));
            engine.submit_order(order("C-1", OrderSide::Buy, 10));
            engine
                .executions()
                .into_iter()
                .map(|e| e.execution_id.to_string())
                .collect::<Vec<_>>()
        };
        assert_eq!(run(), run());
    }

    #[test]
    fn reset_returns_the_account_to_its_starting_state() {
        let mut engine = engine();
        engine.on_quote(&quote(21_174, 21_176));
        engine.submit_order(order("C-1", OrderSide::Buy, 10));
        engine.reset();

        let account = engine.account_state();
        assert!(engine.open_positions().is_empty());
        assert!(engine.executions().is_empty());
        assert_eq!(account.current_capital, account.initial_capital);
        assert_eq!(account.realized_pnl, Money::ZERO);
    }
}
