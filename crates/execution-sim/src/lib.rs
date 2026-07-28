use chrono::Utc;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tradeview_domain::{InstrumentId, OrderSide, OrderStatus, OrderType, Quote, TradeTick};
use tradeview_oms::{
    AccountState, ExecutionRecord, OrderRecord, PlaceOrderCommand, PositionRecord,
};
use tradeview_risk_engine::{RiskCheckResult, RiskEngine};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ExecutionEngineEvent {
    AccountUpdated(AccountState),
    OrderStateChanged(OrderRecord),
    PositionUpdated(Vec<PositionRecord>),
    ExecutionOccurred(ExecutionRecord),
    OrderRejected { client_order_id: String, reason: String },
}

pub struct SimExecutionEngine {
    account: AccountState,
    risk_engine: RiskEngine,
    positions: HashMap<String, PositionRecord>,
    orders: HashMap<String, OrderRecord>,
    executions: Vec<ExecutionRecord>,
    current_bid: Decimal,
    current_ask: Decimal,
}

impl SimExecutionEngine {
    pub fn new(account_id: &str, initial_capital: Decimal) -> Self {
        Self {
            account: AccountState::new(account_id, initial_capital),
            risk_engine: RiskEngine::default_rules(),
            positions: HashMap::new(),
            orders: HashMap::new(),
            executions: Vec::new(),
            current_bid: Decimal::ZERO,
            current_ask: Decimal::ZERO,
        }
    }

    pub fn account_state(&self) -> AccountState {
        self.account.clone()
    }

    pub fn open_positions(&self) -> Vec<PositionRecord> {
        self.positions.values().cloned().collect()
    }

    pub fn executions(&self) -> Vec<ExecutionRecord> {
        self.executions.clone()
    }

    pub fn reset(&mut self) -> Vec<ExecutionEngineEvent> {
        self.account = AccountState::new(&self.account.account_id, self.account.initial_capital);
        self.positions.clear();
        self.orders.clear();
        self.executions.clear();

        vec![
            ExecutionEngineEvent::AccountUpdated(self.account.clone()),
            ExecutionEngineEvent::PositionUpdated(vec![]),
        ]
    }

    pub fn on_quote(&mut self, quote: &Quote) -> Vec<ExecutionEngineEvent> {
        self.current_bid = quote.bid_price;
        self.current_ask = quote.ask_price;
        self.update_unrealized_pnl()
    }

    pub fn on_tick(&mut self, tick: &TradeTick) -> Vec<ExecutionEngineEvent> {
        if self.current_bid == Decimal::ZERO {
            self.current_bid = tick.price;
            self.current_ask = tick.price;
        }
        self.update_unrealized_pnl()
    }

    fn update_unrealized_pnl(&mut self) -> Vec<ExecutionEngineEvent> {
        let mut total_unrealized = Decimal::ZERO;
        let now = Utc::now();

        for pos in self.positions.values_mut() {
            pos.current_price = match pos.side {
                OrderSide::BUY => self.current_bid,
                OrderSide::SELL => self.current_ask,
            };

            pos.unrealized_pnl = match pos.side {
                OrderSide::BUY => (pos.current_price - pos.entry_price) * pos.quantity,
                OrderSide::SELL => (pos.entry_price - pos.current_price) * pos.quantity,
            };

            total_unrealized += pos.unrealized_pnl;
        }

        self.account.unrealized_pnl = total_unrealized;
        self.account.open_positions_count = self.positions.len();

        vec![
            ExecutionEngineEvent::AccountUpdated(self.account.clone()),
            ExecutionEngineEvent::PositionUpdated(self.open_positions()),
        ]
    }

    pub fn submit_order(&mut self, command: PlaceOrderCommand) -> Vec<ExecutionEngineEvent> {
        let mut events = Vec::new();

        // 1. Risk Check
        if let RiskCheckResult::Rejected(reason) =
            self.risk_engine.evaluate(&command, self.account.current_capital)
        {
            events.push(ExecutionEngineEvent::OrderRejected {
                client_order_id: command.client_order_id.clone(),
                reason,
            });
            return events;
        }

        let now = Utc::now();
        let fill_price = match command.side {
            OrderSide::BUY => {
                if self.current_ask > Decimal::ZERO {
                    self.current_ask
                } else {
                    command.price.unwrap_or(Decimal::ZERO)
                }
            }
            OrderSide::SELL => {
                if self.current_bid > Decimal::ZERO {
                    self.current_bid
                } else {
                    command.price.unwrap_or(Decimal::ZERO)
                }
            }
        };

        if fill_price <= Decimal::ZERO {
            events.push(ExecutionEngineEvent::OrderRejected {
                client_order_id: command.client_order_id.clone(),
                reason: "Market price not available yet".to_string(),
            });
            return events;
        }

        // 2. Create Order Record
        let order_record = OrderRecord {
            client_order_id: command.client_order_id.clone(),
            broker_order_id: Some(format!("SIM-{}", Uuid::new_v4().to_string()[..8].to_uppercase())),
            instrument: command.instrument.clone(),
            side: command.side,
            order_type: command.order_type,
            price: fill_price,
            quantity: command.quantity,
            filled_quantity: command.quantity,
            status: OrderStatus::FILLED,
            created_at: now,
            updated_at: now,
        };

        self.orders.insert(command.client_order_id.clone(), order_record.clone());
        events.push(ExecutionEngineEvent::OrderStateChanged(order_record));

        // 3. Create Execution Record
        let exec_record = ExecutionRecord {
            execution_id: Uuid::new_v4().to_string(),
            client_order_id: command.client_order_id.clone(),
            instrument: command.instrument.clone(),
            side: command.side,
            price: fill_price,
            quantity: command.quantity,
            timestamp: now,
        };

        self.executions.push(exec_record.clone());
        events.push(ExecutionEngineEvent::ExecutionOccurred(exec_record));

        // 4. Update Positions & PnL
        let symbol = command.instrument.0.clone();
        let existing_pos = self.positions.get(&symbol).cloned();

        match command.side {
            OrderSide::BUY => {
                if let Some(mut pos) = existing_pos {
                    if pos.side == OrderSide::BUY {
                        // Increase Long Position
                        let total_qty = pos.quantity + command.quantity;
                        let total_cost = (pos.entry_price * pos.quantity) + (fill_price * command.quantity);
                        pos.entry_price = total_cost / total_qty;
                        pos.quantity = total_qty;
                        self.positions.insert(symbol, pos);
                    } else {
                        // Reduce/Close Short Position
                        let pnl = (pos.entry_price - fill_price) * command.quantity;
                        self.account.realized_pnl += pnl;
                        self.account.current_capital += pnl;
                        self.account.total_trades_count += 1;
                        if pnl >= Decimal::ZERO {
                            self.account.winning_trades_count += 1;
                        } else {
                            self.account.losing_trades_count += 1;
                        }

                        if command.quantity >= pos.quantity {
                            self.positions.remove(&symbol);
                        } else {
                            pos.quantity -= command.quantity;
                            self.positions.insert(symbol, pos);
                        }
                    }
                } else {
                    // Open new Long Position
                    let new_pos = PositionRecord {
                        position_id: Uuid::new_v4().to_string(),
                        instrument: command.instrument.clone(),
                        side: OrderSide::BUY,
                        quantity: command.quantity,
                        entry_price: fill_price,
                        current_price: fill_price,
                        unrealized_pnl: Decimal::ZERO,
                        realized_pnl: Decimal::ZERO,
                        opened_at: now,
                    };
                    self.positions.insert(symbol, new_pos);
                }
            }
            OrderSide::SELL => {
                if let Some(mut pos) = existing_pos {
                    if pos.side == OrderSide::BUY {
                        // Reduce/Close Long Position
                        let pnl = (fill_price - pos.entry_price) * command.quantity;
                        self.account.realized_pnl += pnl;
                        self.account.current_capital += pnl;
                        self.account.total_trades_count += 1;
                        if pnl >= Decimal::ZERO {
                            self.account.winning_trades_count += 1;
                        } else {
                            self.account.losing_trades_count += 1;
                        }

                        if command.quantity >= pos.quantity {
                            self.positions.remove(&symbol);
                        } else {
                            pos.quantity -= command.quantity;
                            self.positions.insert(symbol, pos);
                        }
                    } else {
                        // Increase Short Position
                        let total_qty = pos.quantity + command.quantity;
                        let total_cost = (pos.entry_price * pos.quantity) + (fill_price * command.quantity);
                        pos.entry_price = total_cost / total_qty;
                        pos.quantity = total_qty;
                        self.positions.insert(symbol, pos);
                    }
                } else {
                    // Open new Short Position
                    let new_pos = PositionRecord {
                        position_id: Uuid::new_v4().to_string(),
                        instrument: command.instrument.clone(),
                        side: OrderSide::SELL,
                        quantity: command.quantity,
                        entry_price: fill_price,
                        current_price: fill_price,
                        unrealized_pnl: Decimal::ZERO,
                        realized_pnl: Decimal::ZERO,
                        opened_at: now,
                    };
                    self.positions.insert(symbol, new_pos);
                }
            }
        }

        // Trigger immediate PnL refresh
        events.extend(self.update_unrealized_pnl());
        events
    }
}
