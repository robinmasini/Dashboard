use tradeview_domain::Timestamp;

/// CME equity index futures roll on a March/June/September/December cycle.
const QUARTERLY_MONTHS: [u32; 4] = [3, 6, 9, 12];

/// Front quarterly contract for a CME equity index future.
///
/// Resolved from the injected clock rather than the wall clock, so a replay
/// picks the contract that was live at the replayed instant. The library's own
/// `front_month()` helper is unusable here twice over: it reads the real clock,
/// and it returns the next *calendar* month — in July it would ask for an
/// August MES, which does not exist.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ContractMonth {
    pub year: i32,
    pub month: u32,
}

impl ContractMonth {
    /// IBKR expects `YYYYMM`.
    pub fn as_ibkr(&self) -> String {
        format!("{:04}{:02}", self.year, self.month)
    }

    /// CME code: H=March, M=June, U=September, Z=December.
    pub fn code(&self) -> char {
        match self.month {
            3 => 'H',
            6 => 'M',
            9 => 'U',
            _ => 'Z',
        }
    }
}

/// Day of the month on which the third Friday falls.
fn third_friday(year: i32, month: u32) -> u32 {
    // Zeller-free: walk from the 1st to the first Friday, then add two weeks.
    let first_weekday = weekday_of(year, month, 1);
    // Friday is 5 in ISO numbering (Monday = 1).
    let offset = (5 + 7 - first_weekday) % 7;
    1 + offset + 14
}

/// ISO weekday (Monday = 1 … Sunday = 7) via Sakamoto's algorithm.
fn weekday_of(year: i32, month: u32, day: u32) -> u32 {
    const SHIFT: [i32; 12] = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let mut y = year;
    if month < 3 {
        y -= 1;
    }
    let index = (month - 1) as usize;
    let sunday_based = (y + y / 4 - y / 100 + y / 400 + SHIFT[index] + day as i32).rem_euclid(7);
    // Convert Sunday = 0 into ISO Monday = 1 … Sunday = 7.
    if sunday_based == 0 {
        7
    } else {
        sunday_based as u32
    }
}

/// The contract to trade at `now`: the current quarter until its expiry has
/// passed, the next one afterwards.
pub fn front_quarter(now: Timestamp) -> ContractMonth {
    let date = now.as_datetime();
    let year = date.format("%Y").to_string().parse::<i32>().unwrap_or(1970);
    let month = date.format("%m").to_string().parse::<u32>().unwrap_or(1);
    let day = date.format("%d").to_string().parse::<u32>().unwrap_or(1);

    for candidate_month in QUARTERLY_MONTHS {
        if candidate_month < month {
            continue;
        }
        if candidate_month == month && day > third_friday(year, month) {
            continue;
        }
        return ContractMonth {
            year,
            month: candidate_month,
        };
    }

    // Past December's expiry: the front contract is next year's March.
    ContractMonth {
        year: year + 1,
        month: 3,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    fn at(year: i32, month: u32, day: u32) -> Timestamp {
        let dt = Utc.with_ymd_and_hms(year, month, day, 12, 0, 0).unwrap();
        Timestamp::from_nanos(dt.timestamp_nanos_opt().expect("in range"))
    }

    #[test]
    fn third_friday_matches_known_dates() {
        // Verifiable against a calendar.
        assert_eq!(third_friday(2026, 3), 20);
        assert_eq!(third_friday(2026, 6), 19);
        assert_eq!(third_friday(2026, 9), 18);
        assert_eq!(third_friday(2026, 12), 18);
    }

    #[test]
    fn july_resolves_to_september_not_august() {
        // The exact trap in the library helper: August MES does not exist.
        let month = front_quarter(at(2026, 7, 30));
        assert_eq!(month.month, 9);
        assert_eq!(month.year, 2026);
    }

    #[test]
    fn january_resolves_to_march() {
        assert_eq!(front_quarter(at(2026, 1, 5)).month, 3);
    }

    #[test]
    fn the_quarter_holds_until_its_expiry_passes() {
        // 18 September 2026 is the third Friday; the day itself still trades.
        assert_eq!(front_quarter(at(2026, 9, 17)).month, 9);
        assert_eq!(front_quarter(at(2026, 9, 18)).month, 9);
        assert_eq!(front_quarter(at(2026, 9, 19)).month, 12);
    }

    #[test]
    fn december_expiry_rolls_into_the_next_year() {
        let rolled = front_quarter(at(2026, 12, 31));
        assert_eq!(rolled.year, 2027);
        assert_eq!(rolled.month, 3);
    }

    #[test]
    fn ibkr_format_is_year_then_zero_padded_month() {
        assert_eq!(
            ContractMonth {
                year: 2026,
                month: 9
            }
            .as_ibkr(),
            "202609"
        );
        assert_eq!(
            ContractMonth {
                year: 2026,
                month: 12
            }
            .as_ibkr(),
            "202612"
        );
    }

    #[test]
    fn cme_month_codes_are_correct() {
        assert_eq!(
            ContractMonth {
                year: 2026,
                month: 3
            }
            .code(),
            'H'
        );
        assert_eq!(
            ContractMonth {
                year: 2026,
                month: 6
            }
            .code(),
            'M'
        );
        assert_eq!(
            ContractMonth {
                year: 2026,
                month: 9
            }
            .code(),
            'U'
        );
        assert_eq!(
            ContractMonth {
                year: 2026,
                month: 12
            }
            .code(),
            'Z'
        );
    }

    #[test]
    fn every_instant_of_a_year_resolves_to_a_quarterly_month() {
        for month in 1..=12 {
            for day in [1u32, 15, 28] {
                let resolved = front_quarter(at(2026, month, day));
                assert!(
                    QUARTERLY_MONTHS.contains(&resolved.month),
                    "{month}/{day} gave a non-quarterly month {}",
                    resolved.month
                );
            }
        }
    }
}
