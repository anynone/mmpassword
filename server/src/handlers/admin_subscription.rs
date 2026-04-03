use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::error::AppError;
use crate::models::{
    CreateSubscriptionRequest, Entry, SetSubscriptionEntriesRequest,
    Subscription, SubscriptionWithUrl, UpdateSubscriptionRequest,
};
use crate::AppState;

fn base_url(state: &AppState) -> String {
    state.config.get_base_url()
}

fn get_conn(state: &AppState) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, AppError> {
    state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))
}

pub async fn create_subscription(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateSubscriptionRequest>,
) -> Result<(StatusCode, Json<SubscriptionWithUrl>), AppError> {
    let conn = get_conn(&state)?;
    let sub = crate::db::insert_subscription(&conn, &body, &base_url(&state))?;
    Ok((StatusCode::CREATED, Json(sub)))
}

pub async fn list_subscriptions(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<SubscriptionWithUrl>>, AppError> {
    let conn = get_conn(&state)?;
    let subs = crate::db::get_all_subscriptions(&conn, &base_url(&state))?;
    Ok(Json(subs))
}

pub async fn get_subscription(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let conn = get_conn(&state)?;
    let sub = crate::db::get_subscription_by_token(&conn, &token)?;
    let entry_ids = crate::db::get_subscription_entry_ids(&conn, &token)?;
    let url = format!("{}/api/sub/{}", base_url(&state), sub.token);

    Ok(Json(serde_json::json!({
        "id": sub.id,
        "token": sub.token,
        "url": url,
        "name": sub.name,
        "description": sub.description,
        "expiresAt": sub.expires_at,
        "entryCount": entry_ids.len(),
        "createdAt": sub.created_at,
        "updatedAt": sub.updated_at,
    })))
}

pub async fn update_subscription(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
    Json(body): Json<UpdateSubscriptionRequest>,
) -> Result<Json<Subscription>, AppError> {
    let conn = get_conn(&state)?;
    let sub = crate::db::update_subscription(&conn, &token, &body)?;
    Ok(Json(sub))
}

pub async fn delete_subscription(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
) -> Result<StatusCode, AppError> {
    let conn = get_conn(&state)?;
    crate::db::delete_subscription(&conn, &token)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn refresh_token(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
) -> Result<Json<SubscriptionWithUrl>, AppError> {
    let conn = get_conn(&state)?;
    let sub = crate::db::refresh_subscription_token(&conn, &token, &base_url(&state))?;
    Ok(Json(sub))
}

pub async fn set_entries(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
    Json(body): Json<SetSubscriptionEntriesRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let conn = get_conn(&state)?;
    crate::db::set_subscription_entries(&conn, &token, &body.entry_ids)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn get_entries(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
) -> Result<Json<Vec<Entry>>, AppError> {
    let conn = get_conn(&state)?;
    let entry_ids = crate::db::get_subscription_entry_ids(&conn, &token)?;
    let mut entries = Vec::new();
    for id in &entry_ids {
        if let Ok(e) = crate::db::get_entry_by_id(&conn, id) {
            entries.push(e);
        }
    }
    Ok(Json(entries))
}
