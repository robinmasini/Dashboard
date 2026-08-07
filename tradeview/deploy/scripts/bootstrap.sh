#!/usr/bin/env bash
#
# Runs once, at first boot, as cloud-init user data.
#
# Installs what IB Gateway needs to run without a screen, and leaves the
# account credentials to be supplied afterwards — nothing secret belongs in
# user data, which is readable from the instance metadata service.

set -euo pipefail

exec > >(tee /var/log/tradeview-bootstrap.log) 2>&1
echo "== TradeView bootstrap: $(date --iso-8601=seconds) =="

export DEBIAN_FRONTEND=noninteractive
apt-get update
# Xvfb gives the Gateway a screen it does not have; x11vnc lets an operator
# look at that screen through the SSH tunnel for the first login.
apt-get install -y --no-install-recommends \
  openjdk-21-jre-headless \
  xvfb x11vnc \
  unzip curl ca-certificates \
  chrony

# Clock discipline matters: every candle, block and order carries a timestamp,
# and a drifting host silently mislabels all of them.
systemctl enable --now chrony

id -u tradeview >/dev/null 2>&1 || useradd --create-home --shell /bin/bash tradeview
install -d -o tradeview -g tradeview /opt/tradeview /opt/tradeview/bin /var/log/tradeview

# --- IB Gateway -------------------------------------------------------------
GATEWAY_INSTALLER=/tmp/ibgateway.sh
curl -fsSL -o "$GATEWAY_INSTALLER" \
  "https://download2.interactivebrokers.com/installers/ibgateway/stable-standalone/ibgateway-stable-standalone-linux-x64.sh"
chmod +x "$GATEWAY_INSTALLER"
# The installer is interactive; this answers its prompts with the defaults.
yes n | "$GATEWAY_INSTALLER" -q -dir /opt/ibgateway || true
chown -R tradeview:tradeview /opt/ibgateway

# --- IBC --------------------------------------------------------------------
# Interactive Brokers forces a disconnection once a day. IBC logs the Gateway
# back in and dismisses the dialogs, which is the difference between a robot
# that runs overnight and one that stops at midnight.
IBC_VERSION=3.20.0
curl -fsSL -o /tmp/ibc.zip \
  "https://github.com/IbcAlpha/IBC/releases/download/${IBC_VERSION}/IBCLinux-${IBC_VERSION}.zip"
install -d -o tradeview -g tradeview /opt/ibc
unzip -o -q /tmp/ibc.zip -d /opt/ibc
chmod +x /opt/ibc/*.sh /opt/ibc/scripts/*.sh 2>/dev/null || true
chown -R tradeview:tradeview /opt/ibc

# Credentials live here, readable only by the service account. Filled in after
# provisioning — see deploy/README.md.
install -m 600 -o tradeview -g tradeview /dev/null /opt/tradeview/ibc.env
cat > /opt/tradeview/ibc.env <<'ENV'
# Paper account credentials. Never commit this file.
IB_LOGIN_ID=
IB_PASSWORD=
# "paper" or "live". Nothing here trades live yet.
IB_TRADING_MODE=paper
ENV
chmod 600 /opt/tradeview/ibc.env
chown tradeview:tradeview /opt/tradeview/ibc.env

install -m 600 -o tradeview -g tradeview /dev/null /opt/tradeview/engine.env
cat > /opt/tradeview/engine.env <<'ENV'
# Loopback only: reached through an SSH tunnel, never exposed.
TRADEVIEW_BIND=127.0.0.1:8080
TRADEVIEW_MARKET_SOURCE=IBKR
IB_FEED_KIND=DELAYED
TRADEVIEW_SYMBOLS=MES,MNQ
IB_HOST=127.0.0.1
IB_PORT=4002
IB_CLIENT_ID=1
ENV
chmod 600 /opt/tradeview/engine.env
chown tradeview:tradeview /opt/tradeview/engine.env

echo "== bootstrap complete: fill /opt/tradeview/ibc.env, then upload the engine binary =="
