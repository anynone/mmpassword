use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};

use crate::error::AppError;
use crate::AppState;

pub async fn get_subscription(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    // 1. Build vault JSON
    let vault = crate::db::build_vault_for_subscription(&conn, &token)?;

    // 2. Serialize vault to JSON bytes
    let vault_json = serde_json::to_vec(&vault)
        .map_err(|e| AppError::Internal(format!("serialize: {}", e)))?;

    // 3. Encrypt to base64
    let password = state.config.shared_password.clone();
    drop(conn); // release lock before potentially slow crypto

    let encoded = crate::crypto::encrypt_vault_to_base64(&vault_json, &password)?;

    // 4. Return as text/plain
    Ok((
        StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        encoded,
    ))
}
