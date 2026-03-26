//! Group-related Tauri commands

use tauri::State;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::models::Group;
use crate::state::AppState;
use crate::storage::save_vault_file_with_key;

/// Get all groups
#[tauri::command]
pub async fn get_groups(
    state: State<'_, AppState>,
) -> Result<Vec<Group>> {
    let session = state.session.read();
    let session = session.as_ref().ok_or(AppError::VaultLocked)?;

    Ok(session.vault.groups.clone())
}

/// Get a single group
#[tauri::command]
pub async fn get_group(
    id: String,
    state: State<'_, AppState>,
) -> Result<Group> {
    let session = state.session.read();
    let session = session.as_ref().ok_or(AppError::VaultLocked)?;

    let uuid = Uuid::parse_str(&id)
        .map_err(|_| AppError::GroupNotFound(id.clone()))?;

    session.vault.get_group(uuid)
        .cloned()
        .ok_or(AppError::GroupNotFound(id))
}

/// Create a new group
#[tauri::command]
pub async fn create_group(
    name: String,
    icon: Option<String>,
    state: State<'_, AppState>,
) -> Result<Group> {
    let (group, path, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let mut group = Group::new(&name);
        if let Some(icon) = icon {
            group.icon = Some(icon);
        }

        let group_clone = group.clone();
        session.vault.add_group(group);

        (
            group_clone,
            session.path.clone(),
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault to file
    save_vault_file_with_key(&path, &vault, &key, &salt)?;

    Ok(group)
}

/// Update a group
#[tauri::command]
pub async fn update_group(
    id: String,
    name: String,
    icon: Option<String>,
    state: State<'_, AppState>,
) -> Result<Group> {
    let (group, path, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

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
            session.path.clone(),
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault to file
    save_vault_file_with_key(&path, &vault, &key, &salt)?;

    Ok(group)
}

/// Delete a group
#[tauri::command]
pub async fn delete_group(
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let (path, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::GroupNotFound(id.clone()))?;

        if !session.vault.delete_group(uuid) {
            return Err(AppError::GroupNotFound(id));
        }

        (
            session.path.clone(),
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault to file
    save_vault_file_with_key(&path, &vault, &key, &salt)?;

    Ok(())
}
