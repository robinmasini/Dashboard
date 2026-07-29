use std::collections::HashMap;
use tradeview_common::{Result, TradeViewError};
use tradeview_domain::{ClientOrderId, OrderRecord, OrderStatus, Quantity, Timestamp};

/// Holds the engine's view of its own orders. Registration is idempotent by
/// client order id so a retry after a timeout cannot duplicate an order.
#[derive(Debug, Default)]
pub struct OrderStore {
    orders: HashMap<ClientOrderId, OrderRecord>,
}

impl OrderStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns the already-known record when the id was seen before, rather
    /// than registering a second order.
    pub fn register(&mut self, record: OrderRecord) -> OrderRecord {
        self.orders
            .entry(record.client_order_id.clone())
            .or_insert(record)
            .clone()
    }

    pub fn get(&self, client_order_id: &ClientOrderId) -> Option<&OrderRecord> {
        self.orders.get(client_order_id)
    }

    pub fn transition(
        &mut self,
        client_order_id: &ClientOrderId,
        next: OrderStatus,
        at: Timestamp,
    ) -> Result<OrderRecord> {
        let order = self.orders.get_mut(client_order_id).ok_or_else(|| {
            TradeViewError::invalid(
                "client_order_id",
                format!("unknown order {client_order_id}"),
            )
        })?;

        if !order.status.can_transition_to(next) {
            return Err(TradeViewError::invalid(
                "status",
                format!(
                    "order {client_order_id} cannot move from {:?} to {next:?}",
                    order.status
                ),
            ));
        }

        order.status = next;
        order.updated_at = at;
        Ok(order.clone())
    }

    pub fn record_fill(
        &mut self,
        client_order_id: &ClientOrderId,
        quantity: Quantity,
        at: Timestamp,
    ) -> Result<OrderRecord> {
        let order = self.orders.get_mut(client_order_id).ok_or_else(|| {
            TradeViewError::invalid(
                "client_order_id",
                format!("unknown order {client_order_id}"),
            )
        })?;

        let filled = order.filled_quantity + quantity;
        if filled > order.quantity {
            return Err(TradeViewError::invalid(
                "quantity",
                format!(
                    "fill of {quantity} would overfill order {client_order_id} ({} of {})",
                    order.filled_quantity, order.quantity
                ),
            ));
        }

        let next = if filled == order.quantity {
            OrderStatus::Filled
        } else {
            OrderStatus::PartiallyFilled
        };

        if !order.status.can_transition_to(next) {
            return Err(TradeViewError::invalid(
                "status",
                format!(
                    "order {client_order_id} cannot be filled from {:?}",
                    order.status
                ),
            ));
        }

        order.filled_quantity = filled;
        order.status = next;
        order.updated_at = at;
        Ok(order.clone())
    }

    pub fn open_orders(&self) -> Vec<OrderRecord> {
        self.orders
            .values()
            .filter(|o| !o.status.is_terminal())
            .cloned()
            .collect()
    }

    pub fn len(&self) -> usize {
        self.orders.len()
    }

    pub fn is_empty(&self) -> bool {
        self.orders.is_empty()
    }

    pub fn clear(&mut self) {
        self.orders.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;
    use tradeview_domain::{InstrumentId, OrderSide, OrderType, Price};

    fn qty(value: i64) -> Quantity {
        Quantity::new(Decimal::from(value)).unwrap()
    }

    fn order(id: &str) -> OrderRecord {
        OrderRecord {
            client_order_id: ClientOrderId::new(id),
            broker_order_id: None,
            instrument: InstrumentId::new("NVDA"),
            side: OrderSide::Buy,
            order_type: OrderType::Limit,
            price: Some(Price::new(Decimal::new(21_175, 2)).unwrap()),
            quantity: qty(100),
            filled_quantity: Quantity::ZERO,
            status: OrderStatus::Created,
            created_at: Timestamp::from_nanos(0),
            updated_at: Timestamp::from_nanos(0),
        }
    }

    fn accepted_and_sent(store: &mut OrderStore, id: &str) {
        let oid = ClientOrderId::new(id);
        store
            .transition(&oid, OrderStatus::RiskAccepted, Timestamp::from_nanos(1))
            .unwrap();
        store
            .transition(&oid, OrderStatus::Sent, Timestamp::from_nanos(2))
            .unwrap();
    }

    #[test]
    fn registering_the_same_client_order_id_twice_does_not_duplicate_it() {
        let mut store = OrderStore::new();
        store.register(order("C-1"));

        let mut retry = order("C-1");
        retry.quantity = qty(999);
        let stored = store.register(retry);

        assert_eq!(store.len(), 1);
        assert_eq!(stored.quantity, qty(100));
    }

    #[test]
    fn an_illegal_transition_is_refused() {
        let mut store = OrderStore::new();
        store.register(order("C-1"));

        let error = store
            .transition(
                &ClientOrderId::new("C-1"),
                OrderStatus::Sent,
                Timestamp::from_nanos(1),
            )
            .unwrap_err();
        assert!(matches!(error, TradeViewError::Invalid { .. }));
    }

    #[test]
    fn transitioning_an_unknown_order_is_an_error_not_a_silent_no_op() {
        let mut store = OrderStore::new();
        assert!(store
            .transition(
                &ClientOrderId::new("ghost"),
                OrderStatus::RiskAccepted,
                Timestamp::from_nanos(1)
            )
            .is_err());
    }

    #[test]
    fn partial_fills_accumulate_until_the_order_is_complete() {
        let mut store = OrderStore::new();
        store.register(order("C-1"));
        accepted_and_sent(&mut store, "C-1");

        let oid = ClientOrderId::new("C-1");
        let after_first = store
            .record_fill(&oid, qty(40), Timestamp::from_nanos(3))
            .unwrap();
        assert_eq!(after_first.status, OrderStatus::PartiallyFilled);
        assert_eq!(after_first.remaining_quantity(), qty(60));

        let after_second = store
            .record_fill(&oid, qty(60), Timestamp::from_nanos(4))
            .unwrap();
        assert_eq!(after_second.status, OrderStatus::Filled);
        assert_eq!(after_second.remaining_quantity(), Quantity::ZERO);
    }

    #[test]
    fn a_fill_beyond_the_ordered_quantity_is_rejected() {
        let mut store = OrderStore::new();
        store.register(order("C-1"));
        accepted_and_sent(&mut store, "C-1");

        let oid = ClientOrderId::new("C-1");
        store
            .record_fill(&oid, qty(100), Timestamp::from_nanos(3))
            .unwrap();

        assert!(store
            .record_fill(&oid, qty(1), Timestamp::from_nanos(4))
            .is_err());
    }

    #[test]
    fn only_non_terminal_orders_are_reported_as_open() {
        let mut store = OrderStore::new();
        store.register(order("C-1"));
        store.register(order("C-2"));
        accepted_and_sent(&mut store, "C-1");
        store
            .record_fill(
                &ClientOrderId::new("C-1"),
                qty(100),
                Timestamp::from_nanos(3),
            )
            .unwrap();

        let open = store.open_orders();
        assert_eq!(open.len(), 1);
        assert_eq!(open[0].client_order_id, ClientOrderId::new("C-2"));
    }
}
