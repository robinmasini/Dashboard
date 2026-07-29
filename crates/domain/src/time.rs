use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Timestamp(DateTime<Utc>);

impl Timestamp {
    pub fn new(value: DateTime<Utc>) -> Self {
        Self(value)
    }

    pub fn from_nanos(nanos: i64) -> Self {
        Self(Utc.timestamp_nanos(nanos))
    }

    pub fn as_datetime(&self) -> DateTime<Utc> {
        self.0
    }

    pub fn nanos(&self) -> i64 {
        self.0
            .timestamp_nanos_opt()
            .expect("timestamp outside the representable nanosecond range")
    }
}

impl fmt::Display for Timestamp {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.to_rfc3339())
    }
}

impl From<DateTime<Utc>> for Timestamp {
    fn from(value: DateTime<Utc>) -> Self {
        Self(value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nanosecond_precision_survives_a_round_trip() {
        let ts = Timestamp::from_nanos(1_700_000_000_123_456_789);
        assert_eq!(ts.nanos(), 1_700_000_000_123_456_789);
    }

    #[test]
    fn serialises_as_an_rfc3339_string() {
        let ts = Timestamp::from_nanos(0);
        let json = serde_json::to_string(&ts).unwrap();
        assert_eq!(json, r#""1970-01-01T00:00:00Z""#);
        let back: Timestamp = serde_json::from_str(&json).unwrap();
        assert_eq!(back, ts);
    }

    #[test]
    fn timestamps_order_chronologically() {
        assert!(Timestamp::from_nanos(1) < Timestamp::from_nanos(2));
    }
}
