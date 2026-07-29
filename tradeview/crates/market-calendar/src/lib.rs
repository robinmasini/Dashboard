mod holidays;

use chrono::{Datelike, Duration, NaiveDate, NaiveTime, TimeZone, Weekday};
use chrono_tz::America::New_York;
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use tradeview_domain::Timestamp;

const REGULAR_OPEN: (u32, u32) = (9, 30);
const REGULAR_CLOSE: (u32, u32) = (16, 0);
const HALF_DAY_CLOSE: (u32, u32) = (13, 0);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct MarketSession {
    pub date: NaiveDate,
    pub open: Timestamp,
    pub close: Timestamp,
    pub is_half_day: bool,
}

impl MarketSession {
    pub fn contains(&self, at: Timestamp) -> bool {
        at >= self.open && at < self.close
    }

    /// The moment after which no new position may be opened, leaving `margin`
    /// before the close to flatten what is still open.
    pub fn flatten_deadline(&self, margin: Duration) -> Timestamp {
        Timestamp::new(self.close.as_datetime() - margin)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct MarketCalendar {
    timezone: Tz,
}

impl Default for MarketCalendar {
    fn default() -> Self {
        Self::us_equities()
    }
}

impl MarketCalendar {
    pub fn us_equities() -> Self {
        Self { timezone: New_York }
    }

    pub fn is_trading_day(&self, date: NaiveDate) -> bool {
        !matches!(date.weekday(), Weekday::Sat | Weekday::Sun) && !holidays::is_holiday(date)
    }

    pub fn session(&self, date: NaiveDate) -> Option<MarketSession> {
        if !self.is_trading_day(date) {
            return None;
        }

        let is_half_day = holidays::is_half_day(date);
        let close_at = if is_half_day {
            HALF_DAY_CLOSE
        } else {
            REGULAR_CLOSE
        };

        Some(MarketSession {
            date,
            open: self.local_to_timestamp(date, REGULAR_OPEN),
            close: self.local_to_timestamp(date, close_at),
            is_half_day,
        })
    }

    pub fn session_at(&self, at: Timestamp) -> Option<MarketSession> {
        let local_date = at.as_datetime().with_timezone(&self.timezone).date_naive();
        self.session(local_date)
    }

    pub fn is_open(&self, at: Timestamp) -> bool {
        self.session_at(at).is_some_and(|s| s.contains(at))
    }

    pub fn next_trading_day(&self, after: NaiveDate) -> NaiveDate {
        let mut date = after + Duration::days(1);
        while !self.is_trading_day(date) {
            date += Duration::days(1);
        }
        date
    }

    fn local_to_timestamp(&self, date: NaiveDate, (hour, minute): (u32, u32)) -> Timestamp {
        let naive =
            date.and_time(NaiveTime::from_hms_opt(hour, minute, 0).expect("valid session time"));
        let local = self
            .timezone
            .from_local_datetime(&naive)
            .single()
            .expect("session times never fall in a DST gap or overlap");
        Timestamp::new(local.with_timezone(&chrono::Utc))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Timelike;

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    fn utc_hhmm(ts: Timestamp) -> (u32, u32) {
        let dt = ts.as_datetime();
        (dt.hour(), dt.minute())
    }

    #[test]
    fn a_regular_winter_session_runs_from_1430_to_2100_utc() {
        // January is EST (UTC-5).
        let session = MarketCalendar::us_equities()
            .session(date(2025, 1, 15))
            .unwrap();
        assert_eq!(utc_hhmm(session.open), (14, 30));
        assert_eq!(utc_hhmm(session.close), (21, 0));
        assert!(!session.is_half_day);
    }

    #[test]
    fn a_regular_summer_session_shifts_an_hour_earlier_in_utc() {
        // July is EDT (UTC-4): the same 09:30 local is 13:30 UTC.
        let session = MarketCalendar::us_equities()
            .session(date(2025, 7, 15))
            .unwrap();
        assert_eq!(utc_hhmm(session.open), (13, 30));
        assert_eq!(utc_hhmm(session.close), (20, 0));
    }

    #[test]
    fn the_session_shifts_across_the_spring_dst_boundary() {
        let calendar = MarketCalendar::us_equities();
        // US DST began on 9 March 2025.
        let before = calendar.session(date(2025, 3, 7)).unwrap();
        let after = calendar.session(date(2025, 3, 10)).unwrap();
        assert_eq!(utc_hhmm(before.open), (14, 30));
        assert_eq!(utc_hhmm(after.open), (13, 30));
    }

    #[test]
    fn the_session_shifts_back_across_the_autumn_dst_boundary() {
        let calendar = MarketCalendar::us_equities();
        // US DST ended on 2 November 2025.
        let before = calendar.session(date(2025, 10, 31)).unwrap();
        let after = calendar.session(date(2025, 11, 3)).unwrap();
        assert_eq!(utc_hhmm(before.open), (13, 30));
        assert_eq!(utc_hhmm(after.open), (14, 30));
    }

    #[test]
    fn thanksgiving_has_no_session_and_the_day_after_closes_early() {
        let calendar = MarketCalendar::us_equities();
        assert!(calendar.session(date(2025, 11, 27)).is_none());

        let friday = calendar.session(date(2025, 11, 28)).unwrap();
        assert!(friday.is_half_day);
        assert_eq!(utc_hhmm(friday.close), (18, 0)); // 13:00 EST
    }

    #[test]
    fn weekends_have_no_session() {
        let calendar = MarketCalendar::us_equities();
        assert!(calendar.session(date(2025, 7, 12)).is_none());
        assert!(calendar.session(date(2025, 7, 13)).is_none());
    }

    #[test]
    fn is_open_brackets_the_session_exactly() {
        let calendar = MarketCalendar::us_equities();
        let session = calendar.session(date(2025, 7, 15)).unwrap();

        assert!(calendar.is_open(session.open));
        assert!(!calendar.is_open(Timestamp::new(
            session.open.as_datetime() - Duration::seconds(1)
        )));
        assert!(!calendar.is_open(session.close));
        assert!(calendar.is_open(Timestamp::new(
            session.close.as_datetime() - Duration::seconds(1)
        )));
    }

    #[test]
    fn the_flatten_deadline_sits_a_fixed_margin_before_the_close() {
        let session = MarketCalendar::us_equities()
            .session(date(2025, 7, 15))
            .unwrap();
        let deadline = session.flatten_deadline(Duration::minutes(10));
        assert_eq!(utc_hhmm(deadline), (19, 50));
        assert!(session.contains(deadline));
    }

    #[test]
    fn a_half_day_flatten_deadline_follows_the_early_close() {
        let session = MarketCalendar::us_equities()
            .session(date(2025, 11, 28))
            .unwrap();
        let deadline = session.flatten_deadline(Duration::minutes(10));
        assert_eq!(utc_hhmm(deadline), (17, 50));
    }

    #[test]
    fn the_next_trading_day_skips_weekends_and_holidays() {
        let calendar = MarketCalendar::us_equities();
        assert_eq!(
            calendar.next_trading_day(date(2025, 12, 26)),
            date(2025, 12, 29)
        );
        assert_eq!(
            calendar.next_trading_day(date(2025, 12, 31)),
            date(2026, 1, 2)
        );
    }

    #[test]
    fn session_at_resolves_the_new_york_day_not_the_utc_day() {
        let calendar = MarketCalendar::us_equities();
        // 2025-07-15 20:30 UTC is still 16:30 on the 15th in New York.
        let after_close = Timestamp::new(
            chrono::Utc
                .with_ymd_and_hms(2025, 7, 15, 20, 30, 0)
                .unwrap(),
        );
        let session = calendar.session_at(after_close).unwrap();
        assert_eq!(session.date, date(2025, 7, 15));
        assert!(!session.contains(after_close));
    }
}
