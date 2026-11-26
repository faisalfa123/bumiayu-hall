mod config;
mod discovery;
mod proxy;

use axum::{
    extract::State,
    http::{header, StatusCode, Uri},
    response::{IntoResponse, Json},
    routing::{any, get},
    Router,
};
use reqwest::Client;
use rust_embed::RustEmbed;
use serde::Deserialize;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

use config::{load_or_create_config, save_config, AppConfig};
use discovery::{discover_all_apps, gather_system_info};
use proxy::{proxy_handler, proxy_root_handler, AppState};

#[derive(RustEmbed)]
#[folder = "frontend/dist"]
struct Assets;

#[derive(Deserialize)]
struct RawYamlPayload {
    yaml: String,
}

async fn bind_available_port(start_port: u16) -> (TcpListener, u16) {
    let mut port = start_port;
    loop {
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        match TcpListener::bind(addr).await {
            Ok(listener) => return (listener, port),
            Err(_) => {
                tracing::warn!("Port {} already in use, trying {}...", port, port + 1);
                port = port.saturating_add(1);
            }
        }
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let version = include_str!("../VERSION").trim().to_string();
    let config_path = "config.yaml".to_string();
    let cfg = load_or_create_config(&config_path);

    let (listener, active_port) = bind_available_port(1001).await;
    tracing::info!("Bumiayu Hall v{} listening on http://0.0.0.0:{}", version, active_port);

    let http_client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("reqwest client");

    let state = AppState {
        config: Arc::new(RwLock::new(cfg)),
        config_path,
        active_port,
        version,
        http_client,
    };

    let app = Router::new()
        .route("/api/health", get(health_handler))
        .route("/api/system-info", get(system_info_handler))
        .route("/api/discover", get(discover_handler))
        .route("/api/config", get(get_config_handler).put(update_config_handler))
        .route("/api/config/yaml", get(get_yaml_handler).put(update_yaml_handler))
        .route("/p/:slug", any(proxy_root_handler))
        .route("/p/:slug/*rest", any(proxy_handler))
        .fallback(static_handler)
        .layer(CorsLayer::permissive())
        .with_state(state);

    axum::serve(listener, app).await.expect("server error");
}

async fn health_handler(State(state): State<AppState>) -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "version": state.version,
        "port": state.active_port
    }))
}

async fn system_info_handler(State(state): State<AppState>) -> impl IntoResponse {
    Json(gather_system_info(state.active_port, &state.version))
}

async fn discover_handler(State(state): State<AppState>) -> impl IntoResponse {
    let api_url = {
        let cfg = state.config.read().await;
        cfg.mastermind_api_url.clone()
    };
    Json(discover_all_apps(&state.http_client, &api_url, state.active_port).await)
}

async fn get_config_handler(State(state): State<AppState>) -> impl IntoResponse {
    let cfg = state.config.read().await.clone();
    Json(cfg)
}

async fn update_config_handler(
    State(state): State<AppState>,
    Json(new_cfg): Json<AppConfig>,
) -> impl IntoResponse {
    if let Err(e) = save_config(&state.config_path, &new_cfg) {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
    let mut cfg = state.config.write().await;
    *cfg = new_cfg;
    StatusCode::OK.into_response()
}

async fn get_yaml_handler(State(state): State<AppState>) -> impl IntoResponse {
    let cfg = state.config.read().await;
    match serde_yaml::to_string(&*cfg) {
        Ok(yaml) => (StatusCode::OK, yaml).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn update_yaml_handler(
    State(state): State<AppState>,
    Json(payload): Json<RawYamlPayload>,
) -> impl IntoResponse {
    match serde_yaml::from_str::<AppConfig>(&payload.yaml) {
        Ok(new_cfg) => {
            if let Err(e) = save_config(&state.config_path, &new_cfg) {
                return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
            }
            let mut cfg = state.config.write().await;
            *cfg = new_cfg;
            StatusCode::OK.into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, format!("Invalid YAML: {}", e)).into_response(),
    }
}

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let file_path = if path.is_empty() { "index.html" } else { path };

    match Assets::get(file_path) {
        Some(content) => {
            let mime = mime_guess::from_path(file_path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
        }
        None => match Assets::get("index.html") {
            Some(content) => ([(header::CONTENT_TYPE, "text/html")], content.data).into_response(),
            None => (StatusCode::NOT_FOUND, "Frontend not built yet").into_response(),
        },
    }
}
