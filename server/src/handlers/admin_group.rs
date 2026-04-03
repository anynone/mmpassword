use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::db::GroupWithCount;
use crate::error::AppError;
use crate::models::{CreateGroupRequest, Group, UpdateGroupRequest};
use crate::AppState;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupResponse {
    #[serde(flatten)]
    pub group: Group,
    pub entry_count: i64,
}

impl From<GroupWithCount> for GroupResponse {
    fn from(g: GroupWithCount) -> Self {
        Self {
            group: Group {
                id: g.id,
                name: g.name,
                icon: g.icon,
                created_at: g.created_at,
                updated_at: g.updated_at,
            },
            entry_count: g.entry_count,
        }
    }
}

pub async fn create_group(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateGroupRequest>,
) -> Result<(StatusCode, Json<GroupResponse>), AppError> {
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let group = crate::db::insert_group(&conn, &body)?;
    let resp = GroupResponse { group, entry_count: 0 };
    Ok((StatusCode::CREATED, Json(resp)))
}

pub async fn list_groups(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<GroupResponse>>, AppError> {
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let groups = crate::db::get_all_groups(&conn)?;
    Ok(Json(groups.into_iter().map(GroupResponse::from).collect()))
}

pub async fn update_group(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<UpdateGroupRequest>,
) -> Result<Json<GroupResponse>, AppError> {
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let group = crate::db::update_group(&conn, &id, &body)?;
    let groups = crate::db::get_all_groups(&conn)?;
    let entry_count = groups.iter().find(|g| g.id == id).map(|g| g.entry_count).unwrap_or(0);
    Ok(Json(GroupResponse { group, entry_count }))
}

pub async fn delete_group(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let conn = state.conn.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    crate::db::delete_group(&conn, &id)?;
    Ok(StatusCode::NO_CONTENT)
}
