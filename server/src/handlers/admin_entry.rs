use std::sync::Arc;

use axum::{
    extract::{Path, State, rejection::JsonRejection},
    http::StatusCode,
    Json,
};

use crate::error::AppError;
use crate::models::{CreateEntryRequest, Entry, UpdateEntryRequest};
use crate::AppState;

pub async fn create_entry(
    State(state): State<Arc<AppState>>,
    body: Result<Json<CreateEntryRequest>, JsonRejection>,
) -> Result<(StatusCode, Json<Entry>), AppError> {
    let Json(body) = body.map_err(|e| {
        tracing::error!("Failed to deserialize CreateEntryRequest: {}", e);
        AppError::BadRequest(format!("Invalid request body: {}", e))
    })?;
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let entry = crate::db::insert_entry(&conn, &body)?;
    Ok((StatusCode::CREATED, Json(entry)))
}

pub async fn list_entries(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Entry>>, AppError> {
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let entries = crate::db::get_all_entries(&conn)?;
    Ok(Json(entries))
}

pub async fn get_entry(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Entry>, AppError> {
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let entry = crate::db::get_entry_by_id(&conn, &id)?;
    Ok(Json(entry))
}

pub async fn update_entry(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    body: Result<Json<UpdateEntryRequest>, JsonRejection>,
) -> Result<Json<Entry>, AppError> {
    let Json(body) = body.map_err(|e| {
        tracing::error!("Failed to deserialize UpdateEntryRequest: {}", e);
        AppError::BadRequest(format!("Invalid request body: {}", e))
    })?;
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let entry = crate::db::update_entry(&conn, &id, &body)?;
    Ok(Json(entry))
}

pub async fn delete_entry(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    crate::db::delete_entry(&conn, &id)?;
    Ok(StatusCode::NO_CONTENT)
}
