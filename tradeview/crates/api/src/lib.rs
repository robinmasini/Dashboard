use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
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

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<String>,
    pub cmd_tx: mpsc::Sender<ClientWsCommand>,
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

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_websocket(socket, state))
}

async fn handle_websocket(stream: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = stream.split();
    let mut rx = state.tx.subscribe();
    let cmd_tx = state.cmd_tx.clone();

    info!("New WebSocket client connected");

    let mut send_task = tokio::spawn(async move {
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
