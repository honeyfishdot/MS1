use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
    extract::State,
};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::warn;
use uuid::Uuid;

pub struct RateLimitState {
    pub requests_per_minute: u32,
}

impl RateLimitState {
    pub fn new(requests_per_minute: u32) -> Self {
        Self { requests_per_minute }
    }
}

pub async fn request_id_middleware(
    mut req: Request<Body>,
    next: Next,
) -> Response
{
    let request_id = req
        .headers()
        .get("X-Request-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    req.headers_mut()
        .insert("X-Request-ID", request_id.parse().unwrap());

    let mut response = next.run(req).await;
    response.headers_mut().insert("X-Request-ID", request_id.parse().unwrap());
    response
}

pub async fn api_key_middleware(
    State(api_key): State<Arc<String>>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode>
{
    // Health/readiness probes must be reachable without an API key so that
    // platform health checks (Render, Kubernetes, load balancers) succeed.
    let path = req.uri().path();
    if path == "/healthz" || path == "/readyz" {
        return Ok(next.run(req).await);
    }

    let api_key_header = req
        .headers()
        .get("x-api-key")
        .and_then(|v| v.to_str().ok());

    match api_key_header {
        Some(key) if !key.is_empty() => {
            if key == api_key.as_str() {
                Ok(next.run(req).await)
            } else {
                warn!("Invalid API key attempt");
                Err(StatusCode::UNAUTHORIZED)
            }
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

pub async fn rate_limit_middleware(
    State(_state): State<Arc<RateLimitState>>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode>
{
    Ok(next.run(req).await)
}

pub fn build_cors(allowed_origins: &[String]) -> CorsLayer {
    let origins: Vec<_> = allowed_origins
        .iter()
        .filter_map(|origin| {
            origin.parse::<axum::http::HeaderValue>().ok()
        })
        .collect();

    if origins.is_empty() {
        warn!("No CORS origins configured; denying all cross-origin requests");
        CorsLayer::new()
            .allow_methods([axum::http::Method::GET, axum::http::Method::POST])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::HeaderName::from_static("x-api-key"),
                axum::http::header::HeaderName::from_static("x-request-id"),
            ])
    } else {
        let origins = origins.into_iter().collect::<Vec<_>>();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([axum::http::Method::GET, axum::http::Method::POST])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::HeaderName::from_static("x-api-key"),
                axum::http::header::HeaderName::from_static("x-request-id"),
            ])
    }
}