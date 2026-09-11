//! Group-related Tauri commands

use tauri::State;
use uuid::Uuid;

use crate::commands::session_utils::{parse_vault_id, save_vault_changes, update_session_vault};
use crate::error::{AppError, Result};
use crate::models::Group;
use crate::state::AppState;

/// Get all groups
#[tauri::command]
pub async fn get_groups(
    vault_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Group>> {
    let id = parse_vault_id(&vault_id)?;
    let sessions = state.sessions.read();
    let session = sessions.get(&id).ok_or(AppError::VaultLocked)?;

    Ok(session.vault.groups.clone())
}

/// Get a single group
#[tauri::command]
pub async fn get_group(
    vault_id: String,
    id: String,
    state: State<'_, AppState>,
) -> Result<Group> {
    let vault_uuid = parse_vault_id(&vault_id)?;
    let sessions = state.sessions.read();
    let session = sessions.get(&vault_uuid).ok_or(AppError::VaultLocked)?;

    let uuid = Uuid::parse_str(&id)
        .map_err(|_| AppError::GroupNotFound(id.clone()))?;

    session.vault.get_group(uuid)
        .cloned()
        .ok_or(AppError::GroupNotFound(id))
}

/// Create a new group
#[tauri::command]
pub async fn create_group(
    vault_id: String,
    name: String,
    icon: Option<String>,
    state: State<'_, AppState>,
) -> Result<Group> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (group, vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

        let mut group = Group::new(&name);
        if let Some(icon) = icon {
            group.icon = Some(icon);
        }

        let group_clone = group.clone();
        session.vault.add_group(group);

        (
            group_clone,
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    let merged = save_vault_changes(&state, vault_uuid, &vault, &key, &salt, "Create group").await?;

    // Update session with merged vault
    update_session_vault(&state, vault_uuid, merged, false);

    Ok(group)
}

/// Update a group
#[tauri::command]
pub async fn update_group(
    vault_id: String,
    id: String,
    name: String,
    icon: Option<String>,
    state: State<'_, AppState>,
) -> Result<Group> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (group, vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::GroupNotFound(id.clone()))?;

        if !session.vault.update_group(uuid, name, icon) {
            return Err(AppError::GroupNotFound(id));
        }

        let group = session.vault.get_group(uuid)
            .cloned()
            .ok_or(AppError::GroupNotFound(id.clone()))?;

        (
            group,
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    let merged = save_vault_changes(&state, vault_uuid, &vault, &key, &salt, "Update group").await?;

    // Update session with merged vault
    update_session_vault(&state, vault_uuid, merged, false);

    Ok(group)
}

/// Delete a group
#[tauri::command]
pub async fn delete_group(
    vault_id: String,
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::GroupNotFound(id.clone()))?;

        if !session.vault.delete_group(uuid) {
            return Err(AppError::GroupNotFound(id));
        }

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    let merged = save_vault_changes(&state, vault_uuid, &vault, &key, &salt, "Delete group").await?;

    // Update session with merged vault
    update_session_vault(&state, vault_uuid, merged, false);

    Ok(())
}
