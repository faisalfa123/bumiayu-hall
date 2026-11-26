use axum::{
    body::Body,
    extract::{Path, Request, State},
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use reqwest::Client;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::auth::SecretsConfig;
use crate::config::AppConfig;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<RwLock<AppConfig>>,
    pub secrets: Arc<RwLock<SecretsConfig>>,
    pub config_path: String,
    pub active_port: u16,
    pub version: String,
    pub http_client: Client,
}

pub async fn proxy_handler(
    State(state): State<AppState>,
    Path((slug, rest)): Path<(String, String)>,
    req: Request,
) -> Response {
    proxy_inner(state, slug, Some(rest), req).await
}

pub async fn proxy_root_handler(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    req: Request,
) -> Response {
    proxy_inner(state, slug, None, req).await
}

async fn proxy_inner(
    state: AppState,
    slug: String,
    rest: Option<String>,
    req: Request,
) -> Response {
    let target_base = {
        let cfg = state.config.read().await;
        cfg.tiles
            .iter()
            .find(|t| t.slug == slug)
            .map(|t| t.target_url.trim_end_matches('/').to_string())
    };

    let Some(target_base) = target_base else {
        return (StatusCode::NOT_FOUND, format!("App '{}' not found", slug)).into_response();
    };

    let query = req
        .uri()
        .query()
        .map(|q| format!("?{}", q))
        .unwrap_or_default();
    let suffix = rest.unwrap_or_default();
    let target_url = if suffix.is_empty() {
        format!("{}/{}", target_base, query)
    } else {
        format!("{}/{}{}", target_base, suffix.trim_start_matches('/'), query)
    };

    let method = req.method().clone();
    let headers = req.headers().clone();
    let body_bytes = match axum::body::to_bytes(req.into_body(), 16 * 1024 * 1024).await {
        Ok(b) => b,
        Err(_) => return (StatusCode::BAD_REQUEST, "Request body too large").into_response(),
    };

    let mut proxy_req = state.http_client.request(method, &target_url).body(body_bytes);
    for (k, v) in headers.iter() {
        if k.as_str().eq_ignore_ascii_case("host") {
            continue;
        }
        proxy_req = proxy_req.header(k, v);
    }

    match proxy_req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let mut out_headers = HeaderMap::new();
            for (k, v) in resp.headers().iter() {
                if k.as_str().eq_ignore_ascii_case("transfer-encoding")
                    || k.as_str().eq_ignore_ascii_case("x-frame-options")
                    || k.as_str().eq_ignore_ascii_case("content-security-policy")
                {
                    continue;
                }
                if k.as_str().eq_ignore_ascii_case("location") {
                    if let Ok(loc) = v.to_str() {
                        if loc.starts_with('/') && !loc.starts_with(&format!("/p/{}", slug)) {
                            if let Ok(rewritten) = HeaderValue::from_str(&format!("/p/{}{}", slug, loc)) {
                                out_headers.insert(k.clone(), rewritten);
                                continue;
                            }
                        }
                    }
                }
                if let Ok(name) = HeaderName::from_bytes(k.as_str().as_bytes()) {
                    out_headers.insert(name, v.clone());
                }
            }

            let bytes = resp.bytes().await.unwrap_or_default();
            (status, out_headers, Body::from(bytes)).into_response()
        }
        Err(err) => (
            StatusCode::BAD_GATEWAY,
            format!("Failed to reach {}: {}", target_url, err),
        )
            .into_response(),
    }
}
