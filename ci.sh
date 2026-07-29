#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
export PATH="$HOME/.cargo/bin:$PATH"

echo "==> cargo fmt --check"
cargo fmt --all -- --check

echo "==> cargo clippy"
cargo clippy --workspace --all-targets -- -D warnings

echo "==> cargo test"
cargo test --workspace

echo "==> no wall-clock reads outside the clock crate"
if grep -rn "Utc::now()" --include="*.rs" crates apps \
    | grep -v "^crates/clock/src/lib.rs:"; then
    echo "FAIL: business code must take its time from an injected TradingClock" >&2
    exit 1
fi

echo "==> no unseeded randomness"
if grep -rn "thread_rng\|Uuid::new_v4" --include="*.rs" crates apps; then
    echo "FAIL: unseeded randomness breaks deterministic replay" >&2
    exit 1
fi

echo
echo "All Phase 1 checks passed."
