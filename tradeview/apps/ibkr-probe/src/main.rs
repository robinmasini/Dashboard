//! Connection probe: proves the engine can reach Interactive Brokers and read a
//! live feed. It places no orders and holds no state — the point is to fail
//! loudly and legibly when the setup is wrong.

use std::sync::Arc;
use std::time::{Duration, Instant};
use tradeview_broker_core::MarketDataProvider;
use tradeview_broker_ibkr::{IbkrConfig, IbkrMarketData, MICRO_ES};
use tradeview_clock::{SystemClock, TradingClock};
use tradeview_domain::{InstrumentId, MarketEvent};

const RULE: &str = "==============================";

#[tokio::main]
async fn main() {
    if let Err(error) = run().await {
        eprintln!("\n{RULE}\n  ÉCHEC\n{RULE}\n  {error}\n{RULE}\n");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), String> {
    let symbol = std::env::var("IB_SYMBOL").unwrap_or_else(|_| MICRO_ES.to_string());
    let config = IbkrConfig::from_env().map_err(|error| error.to_string())?;

    let endpoint = config
        .endpoint()
        .map(|endpoint| endpoint.to_string())
        .unwrap_or_else(|| "port inconnu".to_string());

    println!("\n{RULE}");
    println!("  CONNEXION IBKR");
    println!("{RULE}");
    println!("  Cible      : {}", config.address());
    println!("  Produit    : {endpoint}");
    println!("  Client ID  : {}", config.client_id);
    println!("  Contrat    : {symbol} (future CME)");

    // A live endpoint is never entered silently: the operator must see it.
    if config.endpoint().is_some_and(|endpoint| endpoint.is_live()) {
        println!("\n  ⚠  COMPTE RÉEL — cette sonde ne passe aucun ordre, mais vérifie la cible.");
    }
    println!("{RULE}\n");

    let clock: Arc<dyn TradingClock> = Arc::new(SystemClock::new());
    let provider = IbkrMarketData::new(config.clone(), clock);
    let instrument = InstrumentId::new(&symbol);

    println!("  Connexion en cours…");
    let mut feed = provider
        .subscribe(std::slice::from_ref(&instrument))
        .await
        .map_err(|error| error.to_string())?;

    println!("  Connexion : OK — en attente du premier tick\n");

    let started = Instant::now();
    let stale_after = Duration::from_secs(config.stale_after_secs);
    let mut received: u64 = 0;

    loop {
        // Silence is a failure mode of its own: outside CME hours, or without a
        // subscription, the socket stays open and simply never delivers.
        let next = tokio::time::timeout(stale_after, feed.recv()).await;

        match next {
            Err(_) => {
                if received == 0 {
                    return Err(format!(
                        "connecté mais aucune donnée après {}s.\n  \
                         Causes probables : marché CME fermé, abonnement données CME absent,\n  \
                         ou contrat {symbol} expiré côté IBKR.",
                        config.stale_after_secs
                    ));
                }
                return Err(format!(
                    "flux interrompu : plus aucun tick depuis {}s ({received} reçus).",
                    config.stale_after_secs
                ));
            }
            Ok(None) => {
                return Err(format!(
                    "flux fermé par Interactive Brokers après {received} tick(s)."
                ));
            }
            Ok(Some(MarketEvent::Quote(quote))) => {
                received += 1;
                let bid = quote.bid_price.value();
                let ask = quote.ask_price.value();
                let spread = ask - bid;

                println!("{RULE}");
                println!("  IBKR CONNECTED");
                println!("{RULE}");
                println!("  Contrat   : {symbol}");
                println!("  Bid       : {bid}  x {}", quote.bid_size.value());
                println!("  Ask       : {ask}  x {}", quote.ask_size.value());
                println!("  Spread    : {spread}");
                println!("  Séquence  : {}", quote.sequence_number);
                println!(
                    "  Timestamp : {}",
                    quote.timestamp.as_datetime().format("%H:%M:%S%.3f")
                );
                println!("  Reçus     : {received} en {:?}", started.elapsed());
                println!("{RULE}\n");
            }
            Ok(Some(_)) => {}
        }
    }
}
