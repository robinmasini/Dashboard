use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use tradeview_domain::{Candle, Price, Timestamp};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LegDirection {
    Up,
    Down,
}

/// A confirmed swing between two pivots, sized in whole grid steps.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Leg {
    pub direction: LegDirection,
    pub from_price: Price,
    pub to_price: Price,
    pub from_time: Timestamp,
    pub to_time: Timestamp,
    /// Extent of the leg counted in grid steps, never below one.
    pub steps: u32,
    /// False while the swing can still extend: the pivot is not yet confirmed.
    pub is_confirmed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StepAnalysis {
    /// Step the grid would use at its finest, before the density divisor.
    /// A step is a price *difference*, so it is a plain decimal, not a Price.
    pub finest_step: Decimal,
    /// Step actually applied.
    pub step: Decimal,
    pub density: u32,
    pub legs: Vec<Leg>,
}

const NICE_MANTISSAS: [i64; 3] = [10, 25, 50];

/// Largest "round" value not exceeding `value`, walking the 1 / 2.5 / 5 ladder.
/// A grid on arbitrary values would put levels at prices no one watches.
pub fn nice_step(value: Decimal) -> Decimal {
    if value <= Decimal::ZERO {
        return Decimal::new(1, 2);
    }

    let mut best = Decimal::new(1, 4);
    for exponent in -4i32..6 {
        for mantissa in NICE_MANTISSAS {
            // mantissa is expressed in hundredths, so 10 => 0.10 at exponent 0.
            let candidate = Decimal::from(mantissa) * pow10(exponent) / Decimal::from(100);
            if candidate <= value && candidate > best {
                best = candidate;
            }
        }
    }
    best
}

fn pow10(exponent: i32) -> Decimal {
    let mut result = Decimal::ONE;
    let ten = Decimal::from(10);
    for _ in 0..exponent.abs() {
        if exponent >= 0 {
            result *= ten;
        } else {
            result /= ten;
        }
    }
    result
}

/// Median candle range: the smallest step that still clears the noise of a
/// typical bar. Mean would be dragged around by a single spike.
pub fn finest_step(candles: &[Candle]) -> Decimal {
    let mut ranges: Vec<Decimal> = candles
        .iter()
        .map(|candle| candle.high.value() - candle.low.value())
        .filter(|range| *range > Decimal::ZERO)
        .collect();

    if ranges.is_empty() {
        return Decimal::new(1, 2);
    }

    ranges.sort();
    let middle = ranges.len() / 2;
    let median = if ranges.len().is_multiple_of(2) {
        (ranges[middle - 1] + ranges[middle]) / Decimal::from(2)
    } else {
        ranges[middle]
    };
    median.round_dp(2)
}

/// Walks the candles emitting a swing whenever price retraces a full step from
/// the running extreme. Anything smaller is noise and leaves the leg open.
pub fn analyse(candles: &[Candle], density: u32) -> StepAnalysis {
    let density = density.max(1);
    let finest = finest_step(candles);
    let step = nice_step(finest / Decimal::from(density));

    let mut legs = Vec::new();
    if candles.len() < 2 || step <= Decimal::ZERO {
        return StepAnalysis {
            finest_step: finest,
            step,
            density,
            legs,
        };
    }

    let first = &candles[0];
    let mut direction = if first.close.value() >= first.open.value() {
        LegDirection::Up
    } else {
        LegDirection::Down
    };
    let mut anchor_price = if direction == LegDirection::Up {
        first.low
    } else {
        first.high
    };
    let mut anchor_time = first.open_time;
    let mut extreme_price = if direction == LegDirection::Up {
        first.high
    } else {
        first.low
    };
    let mut extreme_time = first.close_time;

    for candle in candles.iter().skip(1) {
        match direction {
            LegDirection::Up => {
                // A bar that makes a new high is continuation: its own low is
                // noise inside the leg, and must not reverse against the very
                // extreme it just set.
                let extended = candle.high.value() > extreme_price.value();
                if extended {
                    extreme_price = candle.high;
                    extreme_time = candle.close_time;
                }
                if !extended && extreme_price.value() - candle.low.value() >= step {
                    legs.push(leg(
                        LegDirection::Up,
                        anchor_price,
                        extreme_price,
                        anchor_time,
                        extreme_time,
                        step,
                        true,
                    ));
                    direction = LegDirection::Down;
                    anchor_price = extreme_price;
                    anchor_time = extreme_time;
                    extreme_price = candle.low;
                    extreme_time = candle.close_time;
                }
            }
            LegDirection::Down => {
                let extended = candle.low.value() < extreme_price.value();
                if extended {
                    extreme_price = candle.low;
                    extreme_time = candle.close_time;
                }
                if !extended && candle.high.value() - extreme_price.value() >= step {
                    legs.push(leg(
                        LegDirection::Down,
                        anchor_price,
                        extreme_price,
                        anchor_time,
                        extreme_time,
                        step,
                        true,
                    ));
                    direction = LegDirection::Up;
                    anchor_price = extreme_price;
                    anchor_time = extreme_time;
                    extreme_price = candle.high;
                    extreme_time = candle.close_time;
                }
            }
        }
    }

    // The swing in progress is shown, but flagged: its pivot can still move.
    legs.push(leg(
        direction,
        anchor_price,
        extreme_price,
        anchor_time,
        extreme_time,
        step,
        false,
    ));

    StepAnalysis {
        finest_step: finest,
        step,
        density,
        legs,
    }
}

#[allow(clippy::too_many_arguments)]
fn leg(
    direction: LegDirection,
    from_price: Price,
    to_price: Price,
    from_time: Timestamp,
    to_time: Timestamp,
    step: Decimal,
    is_confirmed: bool,
) -> Leg {
    let travelled = (to_price.value() - from_price.value()).abs();
    let steps = (travelled / step).floor();
    Leg {
        direction,
        from_price,
        to_price,
        from_time,
        to_time,
        steps: steps.try_into().unwrap_or(0u32).max(1),
        is_confirmed,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tradeview_domain::{InstrumentId, Quantity, Timeframe};

    fn price(value: i64) -> Price {
        Price::new(Decimal::from(value)).expect("test prices are positive")
    }

    fn candle(index: i64, low: i64, high: i64) -> Candle {
        Candle {
            instrument: InstrumentId::new("NVDA"),
            timeframe: Timeframe::M5,
            open: price(low),
            high: price(high),
            low: price(low),
            close: price(high),
            volume: Quantity::new(Decimal::from(1)).expect("test volume is positive"),
            open_time: Timestamp::from_nanos(index * 300 * 1_000_000_000),
            close_time: Timestamp::from_nanos((index + 1) * 300 * 1_000_000_000),
            ticks_count: 1,
            is_closed: true,
        }
    }

    #[test]
    fn nice_step_walks_the_one_two_five_ladder() {
        assert_eq!(nice_step(Decimal::new(63, 2)), Decimal::new(50, 2));
        assert_eq!(nice_step(Decimal::new(30, 2)), Decimal::new(25, 2));
        assert_eq!(nice_step(Decimal::new(24, 2)), Decimal::new(10, 2));
        assert_eq!(nice_step(Decimal::from(7)), Decimal::from(5));
        assert_eq!(nice_step(Decimal::from(12)), Decimal::from(10));
    }

    #[test]
    fn the_observed_silo_pair_is_reproduced() {
        // finestStep 0.63 at density 1 is displayed as step 0.50.
        assert_eq!(nice_step(Decimal::new(63, 2)), Decimal::new(50, 2));
    }

    #[test]
    fn a_higher_density_yields_a_finer_grid() {
        let candles: Vec<Candle> = (0..6).map(|i| candle(i, 100, 101)).collect();
        let coarse = analyse(&candles, 1).step;
        let fine = analyse(&candles, 4).step;
        assert!(fine < coarse);
    }

    #[test]
    fn nice_step_never_returns_zero_for_degenerate_input() {
        assert!(nice_step(Decimal::ZERO) > Decimal::ZERO);
        assert!(nice_step(Decimal::from(-5)) > Decimal::ZERO);
    }

    #[test]
    fn finest_step_uses_the_median_not_the_mean() {
        let candles = vec![
            candle(0, 100, 101), // range 1
            candle(1, 100, 101), // range 1
            candle(2, 100, 200), // range 100, a spike
        ];
        assert_eq!(finest_step(&candles), Decimal::from(1));
    }

    #[test]
    fn too_few_candles_produce_no_legs() {
        assert!(analyse(&[], 1).legs.is_empty());
        assert!(analyse(&[candle(0, 100, 101)], 1).legs.is_empty());
    }

    #[test]
    fn a_retracement_of_one_step_confirms_the_pivot() {
        // Step resolves to 1 with unit ranges; the drop to 98 retraces 4.
        let candles = vec![
            candle(0, 100, 101),
            candle(1, 101, 102),
            candle(2, 98, 99),
            candle(3, 97, 98),
        ];
        let analysis = analyse(&candles, 1);

        assert!(analysis.legs.len() >= 2);
        let first = &analysis.legs[0];
        assert_eq!(first.direction, LegDirection::Up);
        assert!(first.is_confirmed);
        assert_eq!(first.to_price, price(102));
    }

    #[test]
    fn the_final_leg_is_left_unconfirmed() {
        let candles = vec![candle(0, 100, 101), candle(1, 101, 105)];
        let analysis = analyse(&candles, 1);

        let last = analysis.legs.last().unwrap();
        assert!(!last.is_confirmed, "a swing still running is not a pivot");
    }

    #[test]
    fn noise_below_one_step_does_not_break_a_leg() {
        // Ranges of 10 put the step at 10, while each pullback here is only 5.
        let candles = vec![
            candle(0, 100, 110),
            candle(1, 105, 115),
            candle(2, 110, 120),
        ];
        let analysis = analyse(&candles, 1);
        let confirmed = analysis.legs.iter().filter(|l| l.is_confirmed).count();
        assert_eq!(
            confirmed, 0,
            "a pullback under one step must not confirm a pivot"
        );
    }

    #[test]
    fn leg_size_is_at_least_one_step() {
        let candles = vec![candle(0, 100, 101), candle(1, 100, 101)];
        for leg in analyse(&candles, 1).legs {
            assert!(leg.steps >= 1);
        }
    }
}
