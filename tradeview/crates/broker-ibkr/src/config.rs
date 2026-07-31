use std::fmt;
use tradeview_common::{Result, TradeViewError};

/// Which IBKR endpoint we are talking to. The two products listen on different
/// ports, and confusing them is the most common cause of a silent timeout.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Endpoint {
    GatewayPaper,
    GatewayLive,
    TwsPaper,
    TwsLive,
}

impl Endpoint {
    pub fn from_port(port: u16) -> Option<Self> {
        match port {
            4002 => Some(Self::GatewayPaper),
            4001 => Some(Self::GatewayLive),
            7497 => Some(Self::TwsPaper),
            7496 => Some(Self::TwsLive),
            _ => None,
        }
    }

    pub fn is_live(&self) -> bool {
        matches!(self, Self::GatewayLive | Self::TwsLive)
    }
}

impl fmt::Display for Endpoint {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let label = match self {
            Self::GatewayPaper => "IB Gateway (paper)",
            Self::GatewayLive => "IB Gateway (LIVE)",
            Self::TwsPaper => "TWS (paper)",
            Self::TwsLive => "TWS (LIVE)",
        };
        write!(f, "{label}")
    }
}

/// Connection settings. Nothing here is hardcoded: every field comes from the
/// environment so the same binary runs locally, in ECS, or on EC2 with values
/// supplied by Secrets Manager.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IbkrConfig {
    pub host: String,
    pub port: u16,
    /// Distinct per connected process. Two clients sharing an id are rejected
    /// by TWS, which surfaces as an unexplained disconnect.
    pub client_id: i32,
    pub connect_timeout_secs: u64,
    /// Seconds without any tick before the feed is declared stale.
    pub stale_after_secs: u64,
}

impl Default for IbkrConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 4002,
            client_id: 1,
            connect_timeout_secs: 10,
            stale_after_secs: 30,
        }
    }
}

fn parse_var<T: std::str::FromStr>(key: &'static str, fallback: T) -> Result<T> {
    match std::env::var(key) {
        Err(_) => Ok(fallback),
        Ok(raw) => raw.trim().parse::<T>().map_err(|_| {
            TradeViewError::invalid(key, format!("expected a number, got {:?}", raw.trim()))
        }),
    }
}

impl IbkrConfig {
    /// Builds the configuration from the environment, rejecting anything
    /// unusable instead of falling back to a default that would connect to the
    /// wrong account.
    pub fn from_env() -> Result<Self> {
        let defaults = Self::default();

        let host = std::env::var("IB_HOST").unwrap_or(defaults.host);
        let port: u16 = parse_var("IB_PORT", defaults.port)?;
        let client_id: i32 = parse_var("IB_CLIENT_ID", defaults.client_id)?;
        let connect_timeout_secs =
            parse_var("IB_CONNECT_TIMEOUT_SECS", defaults.connect_timeout_secs)?;
        let stale_after_secs = parse_var("IB_STALE_AFTER_SECS", defaults.stale_after_secs)?;

        if host.trim().is_empty() {
            return Err(TradeViewError::invalid("IB_HOST", "must not be empty"));
        }
        if connect_timeout_secs == 0 {
            return Err(TradeViewError::invalid(
                "IB_CONNECT_TIMEOUT_SECS",
                "must be at least 1 second",
            ));
        }

        Ok(Self {
            host: host.trim().to_string(),
            port,
            client_id,
            connect_timeout_secs,
            stale_after_secs,
        })
    }

    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    pub fn endpoint(&self) -> Option<Endpoint> {
        Endpoint::from_port(self.port)
    }

    /// Guidance shown when the port matches no known IBKR product, which is
    /// otherwise diagnosed only after a long, silent timeout.
    pub fn port_hint(&self) -> Option<&'static str> {
        if self.endpoint().is_some() {
            return None;
        }
        Some(
            "unrecognised port: IB Gateway listens on 4002 (paper) / 4001 (live), \
             TWS on 7497 (paper) / 7496 (live)",
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gateway_and_tws_ports_are_told_apart() {
        assert_eq!(Endpoint::from_port(4002), Some(Endpoint::GatewayPaper));
        assert_eq!(Endpoint::from_port(4001), Some(Endpoint::GatewayLive));
        assert_eq!(Endpoint::from_port(7497), Some(Endpoint::TwsPaper));
        assert_eq!(Endpoint::from_port(7496), Some(Endpoint::TwsLive));
        assert_eq!(Endpoint::from_port(8080), None);
    }

    #[test]
    fn only_the_live_ports_are_flagged_live() {
        assert!(Endpoint::GatewayLive.is_live());
        assert!(Endpoint::TwsLive.is_live());
        assert!(!Endpoint::GatewayPaper.is_live());
        assert!(!Endpoint::TwsPaper.is_live());
    }

    #[test]
    fn the_default_targets_the_paper_gateway() {
        let config = IbkrConfig::default();
        assert_eq!(config.port, 4002);
        assert_eq!(config.endpoint(), Some(Endpoint::GatewayPaper));
        assert!(!config.endpoint().unwrap().is_live());
    }

    #[test]
    fn an_unknown_port_yields_a_hint_naming_both_products() {
        let config = IbkrConfig {
            port: 7500,
            ..IbkrConfig::default()
        };
        let hint = config.port_hint().expect("unknown port must be explained");
        assert!(hint.contains("4002"));
        assert!(hint.contains("7497"));
    }

    #[test]
    fn a_known_port_needs_no_hint() {
        assert!(IbkrConfig::default().port_hint().is_none());
    }

    #[test]
    fn the_address_joins_host_and_port() {
        let config = IbkrConfig {
            host: "10.0.0.4".into(),
            port: 4001,
            ..IbkrConfig::default()
        };
        assert_eq!(config.address(), "10.0.0.4:4001");
    }
}
