mod auth;
mod config;
mod discovery;
mod proxy;

use axum::{
    extract::State,
    http::{header, StatusCode, Uri},
    response::{IntoResponse, Json},
    routing::{any, get, post},
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

use auth::{generate_token, load_or_create_secrets, verify_password};
use config::{load_or_create_config, save_config, AppConfig};
use discovery::{discover_all_apps, gather_system_info, gather_system_stats};
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
    let secrets_path = "secrets.json".to_string();
    let cfg = load_or_create_config(&config_path);
    let secrets = load_or_create_secrets(&secrets_path);

    let (listener, active_port) = bind_available_port(1001).await;
    tracing::info!("Bumiayu Hall v{} listening on http://0.0.0.0:{}", version, active_port);

    let http_client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("reqwest client");

    let state = AppState {
        config: Arc::new(RwLock::new(cfg)),
        secrets: Arc::new(RwLock::new(secrets)),
        config_path,
        active_port,
        version,
        http_client,
    };

    // Background Mastermind Auto-Sync (every 30s)
    let sync_state = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            let api_url = {
                let cfg = sync_state.config.read().await;
                cfg.mastermind_api_url.clone()
            };
            let discovered = discover_all_apps(&sync_state.http_client, &api_url, sync_state.active_port).await;
            if !discovered.is_empty() {
                let mut cfg = sync_state.config.write().await;
                let mut changed = false;
                for app in discovered {
                    let exists = cfg.tiles.iter().any(|t| t.slug == app.slug || t.target_url == app.target_url);
                    if !exists {
                        cfg.tiles.push(config::TileItem {
                            id: format!("{}-auto", app.slug),
                            name: app.name,
                            slug: app.slug,
                            target_url: app.target_url,
                            icon: app.icon,
                            color: "#0078D7".to_string(),
                            size: config::TileSize::Medium,
                            category: app.source,
                        });
                        changed = true;
                    }
                }
                if changed {
                    let _ = save_config(&sync_state.config_path, &cfg);
                }
            }
        }
    });

    let app = Router::new()
        .route("/api/health", get(health_handler))
        .route("/api/system-info", get(system_info_handler))
        .route("/api/system-stats", get(system_stats_handler))
        .route("/api/discover", get(discover_handler))
        .route("/api/device/register", post(register_device_handler))
        .route("/api/auth/admin", post(admin_login_handler))
        .route("/api/auth/root", post(root_verify_handler))
        .route("/api/auth/change-password", post(change_password_handler))
        .route("/api/service/toggle", post(service_toggle_handler))
        .route("/api/server/action", post(server_action_handler))
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

async fn system_stats_handler() -> impl IntoResponse {
    Json(gather_system_stats())
}

#[derive(Deserialize)]
struct PasswordPayload {
    password: String,
}

#[derive(Deserialize)]
struct ServiceTogglePayload {
    slug: String,
    enable: bool,
    admin_token: String,
}

#[derive(Deserialize)]
struct ServerActionPayload {
    action: String,
    root_password: String,
}

async fn register_device_handler() -> impl IntoResponse {
    Json(serde_json::json!({ "device_token": generate_token() }))
}

async fn admin_login_handler(
    State(state): State<AppState>,
    Json(payload): Json<PasswordPayload>,
) -> impl IntoResponse {
    let sec = state.secrets.read().await;
    if verify_password(&payload.password, &sec.admin_hash) {
        Json(serde_json::json!({ "ok": true, "admin_token": sec.admin_session_token })).into_response()
    } else {
        (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "ok": false, "error": "Sandi Admin salah" }))).into_response()
    }
}

#[derive(Deserialize)]
struct ChangePasswordPayload {
    role: String,
    current_password: String,
    new_password: String,
}

async fn change_password_handler(
    State(state): State<AppState>,
    Json(payload): Json<ChangePasswordPayload>,
) -> impl IntoResponse {
    let mut sec = state.secrets.write().await;
    let valid = match payload.role.as_str() {
        "admin" => verify_password(&payload.current_password, &sec.admin_hash),
        "root" => verify_password(&payload.current_password, &sec.root_hash),
        _ => return (StatusCode::BAD_REQUEST, "Role harus 'admin' atau 'root'").into_response(),
    };
    if !valid {
        return (StatusCode::UNAUTHORIZED, "Sandi lama salah").into_response();
    }
    let Ok(new_hash) = auth::hash_password(&payload.new_password) else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Gagal mengenkripsi sandi").into_response();
    };
    if payload.role == "admin" {
        sec.admin_hash = new_hash;
    } else {
        sec.root_hash = new_hash;
    }
    if let Ok(json) = serde_json::to_string_pretty(&*sec) {
        let _ = std::fs::write("secrets.json", json);
    }
    Json(serde_json::json!({ "ok": true, "message": format!("Sandi {} berhasil diubah", payload.role) })).into_response()
}

async fn root_verify_handler(
    State(state): State<AppState>,
    Json(payload): Json<PasswordPayload>,
) -> impl IntoResponse {
    let sec = state.secrets.read().await;
    if verify_password(&payload.password, &sec.root_hash) {
        Json(serde_json::json!({ "ok": true })).into_response()
    } else {
        (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "ok": false, "error": "Sandi Root salah" }))).into_response()
    }
}

async fn service_toggle_handler(
    State(state): State<AppState>,
    Json(payload): Json<ServiceTogglePayload>,
) -> impl IntoResponse {
    let sec = state.secrets.read().await;
    if payload.admin_token != sec.admin_session_token {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }
    let action = if payload.enable { "start" } else { "stop" };
    let status = std::process::Command::new("systemctl")
        .args([action, &payload.slug])
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    Json(serde_json::json!({ "ok": true, "slug": payload.slug, "enabled": payload.enable, "systemd_applied": status })).into_response()
}

async fn server_action_handler(
    State(state): State<AppState>,
    Json(payload): Json<ServerActionPayload>,
) -> impl IntoResponse {
    let sec = state.secrets.read().await;
    if !verify_password(&payload.root_password, &sec.root_hash) {
        return (StatusCode::UNAUTHORIZED, "Sandi Root salah").into_response();
    }
    Json(serde_json::json!({ "ok": true, "action": payload.action, "message": format!("Aksi '{}' diterima", payload.action) })).into_response()
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
