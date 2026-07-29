use serde::{Deserialize, Serialize};
use std::fmt;

macro_rules! string_id {
    ($name:ident) => {
        #[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
        #[serde(transparent)]
        pub struct $name(String);

        impl $name {
            pub fn new(value: impl Into<String>) -> Self {
                Self(value.into())
            }

            pub fn as_str(&self) -> &str {
                &self.0
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str(&self.0)
            }
        }
    };
}

string_id!(AccountId);
string_id!(ClientOrderId);
string_id!(BrokerOrderId);
string_id!(ExecutionId);
string_id!(PositionId);
string_id!(StrategyId);

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct InstrumentId(String);

impl InstrumentId {
    pub fn new(symbol: &str) -> Self {
        Self(symbol.trim().to_uppercase())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for InstrumentId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SequenceNumber(u64);

impl SequenceNumber {
    pub const ZERO: Self = Self(0);

    pub fn new(value: u64) -> Self {
        Self(value)
    }

    pub fn value(&self) -> u64 {
        self.0
    }

    pub fn next(&self) -> Self {
        Self(self.0 + 1)
    }
}

impl fmt::Display for SequenceNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn instrument_id_normalises_case_and_whitespace() {
        assert_eq!(InstrumentId::new(" nvda ").as_str(), "NVDA");
    }

    #[test]
    fn ids_serialise_transparently_not_as_tuple_structs() {
        let id = InstrumentId::new("NVDA");
        assert_eq!(serde_json::to_string(&id).unwrap(), r#""NVDA""#);

        let seq = SequenceNumber::new(42);
        assert_eq!(serde_json::to_string(&seq).unwrap(), "42");

        let account = AccountId::new("U15525670");
        assert_eq!(serde_json::to_string(&account).unwrap(), r#""U15525670""#);
    }

    #[test]
    fn sequence_numbers_advance_monotonically() {
        let a = SequenceNumber::ZERO;
        let b = a.next();
        assert!(b > a);
        assert_eq!(b.value(), 1);
    }
}
