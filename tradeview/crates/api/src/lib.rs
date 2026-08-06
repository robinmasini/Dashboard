use axum::{
    extract::Query,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::StatusCode,
    response::Response,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use tokio::sync::{broadcast, mpsc};
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, warn};
use tradeview_domain::{InstrumentId, PlaceOrderCommand};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action", content = "payload")]
pub enum ClientWsCommand {
    PlaceOrder(PlaceOrderCommand),
    ClosePosition { symbol: InstrumentId },
    ResetAccount,
    SetMarketFeed { running: bool },
}

/// Messages worth replaying to a client that connects late.
///
/// Prices are a stream — missing the last tick costs nothing, another follows.
/// Headlines are not: they arrive in bursts minutes apart, so a browser opening
/// between two polls would show an empty newsletter for minutes while the
/// engine holds the very articles it wants.
#[derive(Clone, Default)]
pub struct ReplayBuffer {
    inner: Arc<Mutex<VecDeque<String>>>,
    capacity: usize,
}

impl ReplayBuffer {
    pub fn new(capacity: usize) -> Self {
        Self {
            inner: Arc::new(Mutex::new(VecDeque::new())),
            capacity: capacity.max(1),
        }
    }

    pub fn push(&self, message: String) {
        let mut buffer = self.inner.lock().expect("replay buffer poisoned");
        if buffer.len() == self.capacity {
            buffer.pop_front();
        }
        buffer.push_back(message);
    }

    pub fn snapshot(&self) -> Vec<String> {
        self.inner
            .lock()
            .expect("replay buffer poisoned")
            .iter()
            .cloned()
            .collect()
    }

    pub fn len(&self) -> usize {
        self.inner.lock().expect("replay buffer poisoned").len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

/// Shared secret required to open the socket.
///
/// The socket accepts orders, so anyone who can reach it can trade the account.
/// On loopback that is the operator alone; the moment it is exposed, it is
/// whoever finds the address.
#[derive(Clone, Default)]
pub struct ApiToken(Option<Arc<String>>);

impl ApiToken {
    pub fn from_env() -> Self {
        Self(
            std::env::var("TRADEVIEW_API_TOKEN")
                .ok()
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .map(Arc::new),
        )
    }

    pub fn is_set(&self) -> bool {
        self.0.is_some()
    }

    /// Compared in constant time: a byte-by-byte early exit leaks the secret
    /// one character at a time to anyone willing to measure.
    pub fn accepts(&self, presented: Option<&str>) -> bool {
        let Some(expected) = self.0.as_deref() else {
            return true;
        };
        let Some(presented) = presented else {
            return false;
        };
        if presented.len() != expected.len() {
            return false;
        }
        expected
            .as_bytes()
            .iter()
            .zip(presented.as_bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
    }
}

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<String>,
    pub cmd_tx: mpsc::Sender<ClientWsCommand>,
    pub replay: ReplayBuffer,
    pub token: ApiToken,
}

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health_handler))
        .route("/ws", get(ws_handler))
        .layer(cors)
        .with_state(state)
}

async fn health_handler() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "tradeview-server",
        "engine": "rust",
        "version": "0.1.0"
    }))
}

#[derive(Deserialize)]
pub struct WsAuth {
    token: Option<String>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(auth): Query<WsAuth>,
    State(state): State<AppState>,
) -> Response {
    if !state.token.accepts(auth.token.as_deref()) {
        warn!("rejected an unauthenticated websocket connection");
        return (StatusCode::UNAUTHORIZED, "invalid or missing token").into_response();
    }
    ws.on_upgrade(|socket| handle_websocket(socket, state))
}

async fn handle_websocket(stream: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = stream.split();
    // Subscribed before the replay is sent, so nothing published in between is
    // lost between the snapshot and the live stream.
    let mut rx = state.tx.subscribe();
    let backlog = state.replay.snapshot();
    let cmd_tx = state.cmd_tx.clone();

    info!(replayed = backlog.len(), "New WebSocket client connected");

    let mut send_task = tokio::spawn(async move {
        for msg in backlog {
            if sender.send(Message::Text(msg)).await.is_err() {
                return;
            }
        }

        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                match serde_json::from_str::<ClientWsCommand>(&text) {
                    Ok(cmd) => {
                        let _ = cmd_tx.send(cmd).await;
                    }
                    // A command the engine cannot read must never be dropped in
                    // silence: the client believes it was accepted.
                    Err(error) => warn!(%error, %text, "rejected malformed client command"),
                }
            } else if let Message::Close(_) = msg {
                break;
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    info!("WebSocket client disconnected");
}
