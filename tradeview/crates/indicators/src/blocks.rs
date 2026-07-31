use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use tradeview_domain::{Candle, Price, Timestamp};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BlockDirection {
    Up,
    Down,
}

/// A run of consecutive candles closing in the same direction, bounded by the
/// extremes reached during the run.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Block {
    pub direction: BlockDirection,
    /// Number of candles in the run.
    pub length: usize,
    pub high: Price,
    pub low: Price,
    pub open: Price,
    pub close: Price,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    /// True while the last candle of the run is the live one: the run may grow.
    pub is_live: bool,
}

impl Block {
    /// Height of the run. A difference, not a price: it may legitimately be zero.
    pub fn range(&self) -> Decimal {
        self.high.value() - self.low.value()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BlockStats {
    pub total: usize,
    pub up_count: usize,
    pub down_count: usize,
    pub up_max_length: usize,
    pub down_max_length: usize,
    /// Mean run length, rounded to one decimal as it is a display figure.
    pub up_mean_length: Decimal,
    pub down_mean_length: Decimal,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BlockAnalysis {
    pub blocks: Vec<Block>,
    pub stats: BlockStats,
}

fn direction_of(candle: &Candle) -> Option<BlockDirection> {
    // A doji continues whichever run is in progress rather than starting a new
    // one, so it carries no direction of its own.
    match candle.close.value().cmp(&candle.open.value()) {
        std::cmp::Ordering::Greater => Some(BlockDirection::Up),
        std::cmp::Ordering::Less => Some(BlockDirection::Down),
        std::cmp::Ordering::Equal => None,
    }
}

fn mean_length(lengths: &[usize]) -> Decimal {
    if lengths.is_empty() {
        return Decimal::ZERO;
    }
    let total: usize = lengths.iter().sum();
    (Decimal::from(total) / Decimal::from(lengths.len())).round_dp(1)
}

/// Groups candles into directional runs. Candles must already be ordered by
/// open time; unordered input would silently produce meaningless blocks.
pub fn analyse(candles: &[Candle]) -> BlockAnalysis {
    let mut blocks: Vec<Block> = Vec::new();

    for (index, candle) in candles.iter().enumerate() {
        let is_last = index + 1 == candles.len();
        let direction = direction_of(candle);

        match direction {
            Some(dir) => match blocks.last_mut() {
                // Same direction: the run in progress grows.
                Some(current) if current.direction == dir => extend(current, candle, is_last),
                // Direction changed, or nothing open yet: a run starts.
                _ => blocks.push(Block {
                    direction: dir,
                    length: 1,
                    high: candle.high,
                    low: candle.low,
                    open: candle.open,
                    close: candle.close,
                    start_time: candle.open_time,
                    end_time: candle.close_time,
                    is_live: is_last && !candle.is_closed,
                }),
            },
            // A flat candle continues whatever is open, and opens nothing.
            None => {
                if let Some(current) = blocks.last_mut() {
                    extend(current, candle, is_last);
                }
            }
        }
    }

    let up: Vec<usize> = blocks
        .iter()
        .filter(|b| b.direction == BlockDirection::Up)
        .map(|b| b.length)
        .collect();
    let down: Vec<usize> = blocks
        .iter()
        .filter(|b| b.direction == BlockDirection::Down)
        .map(|b| b.length)
        .collect();

    let stats = BlockStats {
        total: blocks.len(),
        up_count: up.len(),
        down_count: down.len(),
        up_max_length: up.iter().copied().max().unwrap_or(0),
        down_max_length: down.iter().copied().max().unwrap_or(0),
        up_mean_length: mean_length(&up),
        down_mean_length: mean_length(&down),
    };

    BlockAnalysis { blocks, stats }
}

fn extend(block: &mut Block, candle: &Candle, is_last: bool) {
    block.length += 1;
    if candle.high.value() > block.high.value() {
        block.high = candle.high;
    }
    if candle.low.value() < block.low.value() {
        block.low = candle.low;
    }
    block.close = candle.close;
    block.end_time = candle.close_time;
    block.is_live = is_last && !candle.is_closed;
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;
    use tradeview_domain::{InstrumentId, Quantity, Timeframe};

    fn price(value: i64) -> Price {
        Price::new(Decimal::from(value)).expect("test prices are positive")
    }

    fn candle(index: i64, open: i64, close: i64, closed: bool) -> Candle {
        let (low, high) = if open <= close {
            (open, close)
        } else {
            (close, open)
        };
        Candle {
            instrument: InstrumentId::new("NVDA"),
            timeframe: Timeframe::M5,
            open: price(open),
            high: price(high),
            low: price(low),
            close: price(close),
            volume: Quantity::new(Decimal::from(1)).expect("test volume is positive"),
            open_time: Timestamp::from_nanos(index * 300 * 1_000_000_000),
            close_time: Timestamp::from_nanos((index + 1) * 300 * 1_000_000_000),
            ticks_count: 1,
            is_closed: closed,
        }
    }

    #[test]
    fn no_candles_produce_no_blocks() {
        let analysis = analyse(&[]);
        assert!(analysis.blocks.is_empty());
        assert_eq!(analysis.stats.total, 0);
        assert_eq!(analysis.stats.up_mean_length, Decimal::ZERO);
    }

    #[test]
    fn consecutive_up_candles_form_one_block() {
        let candles = vec![
            candle(0, 100, 101, true),
            candle(1, 101, 103, true),
            candle(2, 103, 104, true),
        ];
        let analysis = analyse(&candles);

        assert_eq!(analysis.blocks.len(), 1);
        let block = &analysis.blocks[0];
        assert_eq!(block.direction, BlockDirection::Up);
        assert_eq!(block.length, 3);
        assert_eq!(block.low, price(100));
        assert_eq!(block.high, price(104));
    }

    #[test]
    fn a_reversal_starts_a_new_block() {
        let candles = vec![
            candle(0, 100, 102, true),
            candle(1, 102, 101, true),
            candle(2, 101, 100, true),
        ];
        let analysis = analyse(&candles);

        assert_eq!(analysis.blocks.len(), 2);
        assert_eq!(analysis.blocks[0].direction, BlockDirection::Up);
        assert_eq!(analysis.blocks[0].length, 1);
        assert_eq!(analysis.blocks[1].direction, BlockDirection::Down);
        assert_eq!(analysis.blocks[1].length, 2);
    }

    #[test]
    fn a_flat_candle_extends_the_run_rather_than_splitting_it() {
        let candles = vec![
            candle(0, 100, 102, true),
            candle(1, 102, 102, true),
            candle(2, 102, 104, true),
        ];
        let analysis = analyse(&candles);

        assert_eq!(analysis.blocks.len(), 1, "a doji must not break the run");
        assert_eq!(analysis.blocks[0].length, 3);
    }

    #[test]
    fn a_leading_flat_candle_opens_no_block() {
        let candles = vec![candle(0, 100, 100, true), candle(1, 100, 101, true)];
        let analysis = analyse(&candles);

        assert_eq!(analysis.blocks.len(), 1);
        assert_eq!(analysis.blocks[0].direction, BlockDirection::Up);
        assert_eq!(analysis.blocks[0].length, 1);
    }

    #[test]
    fn only_an_unclosed_final_candle_marks_the_block_live() {
        let closed = analyse(&[candle(0, 100, 101, true)]);
        assert!(!closed.blocks[0].is_live);

        let live = analyse(&[candle(0, 100, 101, false)]);
        assert!(live.blocks[0].is_live);
    }

    #[test]
    fn stats_count_and_average_each_direction() {
        let candles = vec![
            candle(0, 100, 102, true), // up, length 1
            candle(1, 102, 101, true), // down, length 3
            candle(2, 101, 100, true),
            candle(3, 100, 99, true),
            candle(4, 99, 101, true), // up, length 2
            candle(5, 101, 103, true),
        ];
        let stats = analyse(&candles).stats;

        assert_eq!(stats.total, 3);
        assert_eq!(stats.up_count, 2);
        assert_eq!(stats.down_count, 1);
        assert_eq!(stats.up_max_length, 2);
        assert_eq!(stats.down_max_length, 3);
        // (1 + 2) / 2 = 1.5
        assert_eq!(stats.up_mean_length, Decimal::new(15, 1));
        assert_eq!(stats.down_mean_length, Decimal::from(3));
    }

    #[test]
    fn block_bounds_span_the_wicks_not_just_the_bodies() {
        let mut wide = candle(0, 100, 101, true);
        wide.high = price(110);
        wide.low = price(90);

        let analysis = analyse(&[wide, candle(1, 101, 102, true)]);
        assert_eq!(analysis.blocks[0].high, price(110));
        assert_eq!(analysis.blocks[0].low, price(90));
    }
}
