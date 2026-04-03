use std::sync::Arc;

use axum::{
    extract::Request,
    http::HeaderMap,
    middleware::Next,
    response::Response,
};

use crate::error::AppError;
use crate::AppState;

pub async fn require_auth(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized);
    }

    let token = &auth_header[7..];
    if token != state.config.admin_token {
        return Err(AppError::Unauthorized);
    }

    Ok(next.run(request).await)
}
