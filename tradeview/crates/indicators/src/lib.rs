//! Chart analytics computed once, in the engine.
//!
//! These are strategy primitives, not decorations: a "block fade" reads the
//! same runs the chart draws. Computing them here keeps what the operator sees
//! and what the robot trades on from drifting apart.

pub mod blocks;
pub mod event;
pub mod steps;

pub use blocks::{analyse as analyse_blocks, Block, BlockAnalysis, BlockDirection, BlockStats};
pub use event::{IndicatorEvent, IndicatorSnapshot, IndicatorWindow};
pub use steps::{analyse as analyse_steps, Leg, LegDirection, StepAnalysis};
