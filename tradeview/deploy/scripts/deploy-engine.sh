#!/usr/bin/env bash
#
# Builds the engine for the instance and installs it.
#
# Cross-compiling from macOS needs a Linux toolchain, which most machines lack;
# building on the host is slower but always works. That trade is deliberate —
# a deployment that only runs on one laptop is not a deployment.

set -euo pipefail

HOST="${1:-}"
if [ -z "$HOST" ]; then
  echo "usage: $0 <ip-or-hostname>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REMOTE="ubuntu@${HOST}"

echo "==> envoi des sources"
ssh "$REMOTE" 'sudo install -d -o ubuntu -g ubuntu /opt/tradeview/src'
rsync -az --delete \
  --exclude target --exclude .git \
  "$REPO_ROOT/" "$REMOTE:/opt/tradeview/src/"

echo "==> compilation sur l'instance"
ssh "$REMOTE" bash -euo pipefail <<'REMOTE_SCRIPT'
if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi
source "$HOME/.cargo/env"

# Building needs more memory than a 2 GB box has to spare while the Gateway
# runs; swap keeps the linker from being killed halfway.
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
fi

cd /opt/tradeview/src
cargo build --release -p tradeview-server
sudo install -o tradeview -g tradeview -m 755 \
  target/release/tradeview-server /opt/tradeview/bin/tradeview-server
REMOTE_SCRIPT

echo "==> redémarrage"
ssh "$REMOTE" 'sudo systemctl restart tradeview-engine 2>/dev/null || true'
echo "==> fait. Journaux : ssh $REMOTE sudo journalctl -u tradeview-engine -f"
