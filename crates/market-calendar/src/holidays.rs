use chrono::{Datelike, Duration, NaiveDate, Weekday};

pub(crate) fn nth_weekday(year: i32, month: u32, weekday: Weekday, n: u32) -> NaiveDate {
    let first = NaiveDate::from_ymd_opt(year, month, 1).expect("valid year/month");
    let offset = (7 + weekday.num_days_from_monday() - first.weekday().num_days_from_monday()) % 7;
    first + Duration::days((offset + (n - 1) * 7) as i64)
}

pub(crate) fn last_weekday(year: i32, month: u32, weekday: Weekday) -> NaiveDate {
    let next_month = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    }
    .expect("valid year/month");

    let mut date = next_month - Duration::days(1);
    while date.weekday() != weekday {
        date -= Duration::days(1);
    }
    date
}

/// Meeus/Jones/Butcher Gregorian algorithm.
pub(crate) fn easter_sunday(year: i32) -> NaiveDate {
    let a = year % 19;
    let b = year / 100;
    let c = year % 100;
    let d = b / 4;
    let e = b % 4;
    let f = (b + 8) / 25;
    let g = (b - f + 1) / 3;
    let h = (19 * a + b - d - g + 15) % 30;
    let i = c / 4;
    let k = c % 4;
    let l = (32 + 2 * e + 2 * i - h - k) % 7;
    let m = (a + 11 * h + 22 * l) / 451;
    let month = (h + l - 7 * m + 114) / 31;
    let day = ((h + l - 7 * m + 114) % 31) + 1;
    NaiveDate::from_ymd_opt(year, month as u32, day as u32).expect("valid easter date")
}

pub(crate) fn good_friday(year: i32) -> NaiveDate {
    easter_sunday(year) - Duration::days(2)
}

/// NYSE shifts a fixed-date holiday landing on a weekend to the adjacent weekday.
fn observed(date: NaiveDate) -> NaiveDate {
    match date.weekday() {
        Weekday::Sat => date - Duration::days(1),
        Weekday::Sun => date + Duration::days(1),
        _ => date,
    }
}

pub(crate) fn holidays(year: i32) -> Vec<NaiveDate> {
    let ymd = |m, d| NaiveDate::from_ymd_opt(year, m, d).expect("valid date");

    let mut days = vec![
        // A New Year's Day on Saturday is not pulled back into the prior year.
        match ymd(1, 1).weekday() {
            Weekday::Sat => ymd(1, 1),
            _ => observed(ymd(1, 1)),
        },
        nth_weekday(year, 1, Weekday::Mon, 3),
        nth_weekday(year, 2, Weekday::Mon, 3),
        good_friday(year),
        last_weekday(year, 5, Weekday::Mon),
        observed(ymd(7, 4)),
        nth_weekday(year, 9, Weekday::Mon, 1),
        nth_weekday(year, 11, Weekday::Thu, 4),
        observed(ymd(12, 25)),
    ];

    if year >= 2022 {
        days.push(observed(ymd(6, 19)));
    }

    days.retain(|d| !matches!(d.weekday(), Weekday::Sat | Weekday::Sun));
    days.sort_unstable();
    days
}

pub(crate) fn is_holiday(date: NaiveDate) -> bool {
    holidays(date.year()).contains(&date)
}

/// Sessions that close early, at 13:00 New York time.
pub(crate) fn is_half_day(date: NaiveDate) -> bool {
    if matches!(date.weekday(), Weekday::Sat | Weekday::Sun) || is_holiday(date) {
        return false;
    }

    let year = date.year();
    let day_after_thanksgiving = nth_weekday(year, 11, Weekday::Thu, 4) + Duration::days(1);

    date == day_after_thanksgiving
        || (date.month() == 12 && date.day() == 24)
        || (date.month() == 7 && date.day() == 3)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn thanksgiving_is_the_fourth_thursday_of_november() {
        assert_eq!(
            nth_weekday(2025, 11, Weekday::Thu, 4),
            NaiveDate::from_ymd_opt(2025, 11, 27).unwrap()
        );
        assert_eq!(
            nth_weekday(2026, 11, Weekday::Thu, 4),
            NaiveDate::from_ymd_opt(2026, 11, 26).unwrap()
        );
    }

    #[test]
    fn memorial_day_is_the_last_monday_of_may() {
        assert_eq!(
            last_weekday(2025, 5, Weekday::Mon),
            NaiveDate::from_ymd_opt(2025, 5, 26).unwrap()
        );
    }

    #[test]
    fn good_friday_matches_published_dates() {
        assert_eq!(
            good_friday(2025),
            NaiveDate::from_ymd_opt(2025, 4, 18).unwrap()
        );
        assert_eq!(
            good_friday(2026),
            NaiveDate::from_ymd_opt(2026, 4, 3).unwrap()
        );
    }

    #[test]
    fn a_saturday_independence_day_is_observed_on_the_friday_before() {
        // 4 July 2026 falls on a Saturday.
        assert!(is_holiday(NaiveDate::from_ymd_opt(2026, 7, 3).unwrap()));
    }

    #[test]
    fn a_sunday_christmas_is_observed_on_the_monday_after() {
        // 25 December 2022 fell on a Sunday.
        assert!(is_holiday(NaiveDate::from_ymd_opt(2022, 12, 26).unwrap()));
    }

    #[test]
    fn a_saturday_new_year_is_not_pulled_back_into_december() {
        // 1 January 2022 was a Saturday; the NYSE traded on 31 December 2021.
        assert!(!is_holiday(NaiveDate::from_ymd_opt(2021, 12, 31).unwrap()));
    }

    #[test]
    fn juneteenth_is_only_a_holiday_from_2022_onwards() {
        assert!(!is_holiday(NaiveDate::from_ymd_opt(2021, 6, 18).unwrap()));
        assert!(is_holiday(NaiveDate::from_ymd_opt(2025, 6, 19).unwrap()));
    }

    #[test]
    fn the_friday_after_thanksgiving_is_a_half_day() {
        assert!(is_half_day(NaiveDate::from_ymd_opt(2025, 11, 28).unwrap()));
        assert!(!is_half_day(NaiveDate::from_ymd_opt(2025, 11, 27).unwrap()));
    }

    #[test]
    fn christmas_eve_is_a_half_day_only_when_it_is_a_trading_day() {
        // 24 December 2025 is a Wednesday.
        assert!(is_half_day(NaiveDate::from_ymd_opt(2025, 12, 24).unwrap()));
        // 24 December 2022 was a Saturday.
        assert!(!is_half_day(NaiveDate::from_ymd_opt(2022, 12, 24).unwrap()));
    }

    #[test]
    fn july_third_is_a_half_day_unless_it_is_the_observed_holiday() {
        assert!(is_half_day(NaiveDate::from_ymd_opt(2025, 7, 3).unwrap()));
        // In 2026 the 3rd *is* the observed Independence Day, so it is closed.
        assert!(!is_half_day(NaiveDate::from_ymd_opt(2026, 7, 3).unwrap()));
    }

    #[test]
    fn holidays_never_land_on_a_weekend() {
        for year in 2020..=2030 {
            for day in holidays(year) {
                assert!(
                    !matches!(day.weekday(), Weekday::Sat | Weekday::Sun),
                    "{day} is a weekend"
                );
            }
        }
    }
}
