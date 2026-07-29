use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::ops::{Add, Neg, Sub};
use tradeview_common::{Result, TradeViewError};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Price(Decimal);

impl Price {
    pub fn new(value: Decimal) -> Result<Self> {
        if value <= Decimal::ZERO {
            return Err(TradeViewError::invalid(
                "price",
                format!("must be strictly positive, got {value}"),
            ));
        }
        Ok(Self(value))
    }

    pub fn value(&self) -> Decimal {
        self.0
    }

    pub fn notional(&self, quantity: Quantity) -> Money {
        Money::new(self.0 * quantity.value())
    }
}

impl fmt::Display for Price {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Quantity(Decimal);

impl Quantity {
    pub const ZERO: Self = Self(Decimal::ZERO);

    pub fn new(value: Decimal) -> Result<Self> {
        if value < Decimal::ZERO {
            return Err(TradeViewError::invalid(
                "quantity",
                format!("must not be negative, got {value}"),
            ));
        }
        Ok(Self(value))
    }

    pub fn value(&self) -> Decimal {
        self.0
    }

    pub fn is_zero(&self) -> bool {
        self.0.is_zero()
    }

    pub fn checked_sub(&self, other: Quantity) -> Result<Self> {
        Self::new(self.0 - other.0)
    }
}

impl Add for Quantity {
    type Output = Quantity;

    fn add(self, rhs: Quantity) -> Quantity {
        Quantity(self.0 + rhs.0)
    }
}

impl fmt::Display for Quantity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Money(Decimal);

impl Money {
    pub const ZERO: Self = Self(Decimal::ZERO);

    pub fn new(value: Decimal) -> Self {
        Self(value)
    }

    pub fn value(&self) -> Decimal {
        self.0
    }

    pub fn is_negative(&self) -> bool {
        self.0 < Decimal::ZERO
    }
}

impl Add for Money {
    type Output = Money;

    fn add(self, rhs: Money) -> Money {
        Money(self.0 + rhs.0)
    }
}

impl Sub for Money {
    type Output = Money;

    fn sub(self, rhs: Money) -> Money {
        Money(self.0 - rhs.0)
    }
}

impl Neg for Money {
    type Output = Money;

    fn neg(self) -> Money {
        Money(-self.0)
    }
}

impl fmt::Display for Money {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;
    use rust_decimal::prelude::FromPrimitive;

    fn decimal(cents: i64) -> Decimal {
        Decimal::new(cents, 2)
    }

    #[test]
    fn price_rejects_zero_and_negative() {
        assert!(Price::new(Decimal::ZERO).is_err());
        assert!(Price::new(decimal(-100)).is_err());
        assert!(Price::new(decimal(100)).is_ok());
    }

    #[test]
    fn quantity_rejects_negative_but_allows_zero() {
        assert!(Quantity::new(decimal(-1)).is_err());
        assert!(Quantity::new(Decimal::ZERO).is_ok());
    }

    #[test]
    fn notional_is_exact_for_fractional_prices() {
        let price = Price::new(Decimal::new(10_005, 2)).unwrap();
        let qty = Quantity::new(Decimal::from(3)).unwrap();
        assert_eq!(price.notional(qty).value(), Decimal::new(30_015, 2));
    }

    #[test]
    fn money_serialises_as_a_bare_number_not_a_tuple_struct() {
        let money = Money::new(decimal(12_345));
        assert_eq!(serde_json::to_string(&money).unwrap(), r#""123.45""#);
    }

    proptest! {
        #[test]
        fn money_addition_is_commutative(a in -1_000_000i64..1_000_000, b in -1_000_000i64..1_000_000) {
            let x = Money::new(Decimal::new(a, 2));
            let y = Money::new(Decimal::new(b, 2));
            prop_assert_eq!(x + y, y + x);
        }

        #[test]
        fn money_sub_is_inverse_of_add(a in -1_000_000i64..1_000_000, b in -1_000_000i64..1_000_000) {
            let x = Money::new(Decimal::new(a, 2));
            let y = Money::new(Decimal::new(b, 2));
            prop_assert_eq!((x + y) - y, x);
        }

        #[test]
        fn money_round_trips_through_json(a in -1_000_000_000i64..1_000_000_000) {
            let money = Money::new(Decimal::new(a, 2));
            let json = serde_json::to_string(&money).unwrap();
            let back: Money = serde_json::from_str(&json).unwrap();
            prop_assert_eq!(money, back);
        }

        #[test]
        fn notional_never_loses_precision_the_way_f64_would(
            cents in 1i64..1_000_000, qty in 1i64..10_000
        ) {
            let price = Price::new(Decimal::new(cents, 2)).unwrap();
            let quantity = Quantity::new(Decimal::from(qty)).unwrap();
            let exact = Decimal::new(cents, 2) * Decimal::from(qty);
            prop_assert_eq!(price.notional(quantity).value(), exact);
        }

        #[test]
        fn price_construction_rejects_everything_not_positive(cents in -1_000_000i64..=0) {
            prop_assert!(Price::new(Decimal::new(cents, 2)).is_err());
        }

        #[test]
        fn quantity_addition_is_associative(a in 0i64..100_000, b in 0i64..100_000, c in 0i64..100_000) {
            let x = Quantity::new(Decimal::from(a)).unwrap();
            let y = Quantity::new(Decimal::from(b)).unwrap();
            let z = Quantity::new(Decimal::from(c)).unwrap();
            prop_assert_eq!((x + y) + z, x + (y + z));
        }
    }

    #[test]
    fn decimal_avoids_the_classic_binary_float_error() {
        let a = Money::new(Decimal::from_f64(0.0).unwrap()) + Money::new(Decimal::new(10, 2));
        let b = Money::new(Decimal::new(20, 2));
        assert_eq!((a + b).value(), Decimal::new(30, 2));
    }
}
