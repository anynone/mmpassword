//! Group-related Tauri commands

use tauri::State;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::git::sync::{get_clone_dir, GitSyncEngine};
use crate::models::Group;
use crate::state::AppState;
use crate::storage::save_vault_file_with_key;

/// Helper to extract Git sync info if available
fn get_git_sync_info(state: &State<'_, AppState>) -> Option<(crate::git::repository::GitRepository, std::path::PathBuf)> {
    let session = state.session.read();
    session.as_ref().and_then(|s| {
        s.git_sync.as_ref().map(|git_sync| {
            let clone_dir = get_clone_dir(&git_sync.repository.url).ok()?;
            Some((git_sync.repository.clone(), clone_dir))
        })
    }).flatten()
}

/// Helper to get local vault path if available
fn get_local_vault_path(state: &State<'_, AppState>) -> Option<std::path::PathBuf> {
    let session = state.session.read();
    session.as_ref().and_then(|s| {
        if s.git_sync.is_none() {
            Some(s.path.clone())
        } else {
            None
        }
    })
}

/// Helper function to save vault - handles both local and Git vaults
async fn save_vault_changes(
    state: &State<'_, AppState>,
    vault: &crate::models::Vault,
    key: &[u8; 32],
    salt: &[u8; 16],
    commit_message: &str,
) -> Result<()> {
    // Check if this is a Git vault (extract info before any await)
    if let Some((repository, clone_dir)) = get_git_sync_info(state) {
        // Git vault - save through GitSyncEngine
        let engine = GitSyncEngine::new(repository, clone_dir);
        engine.save_vault(vault, key, salt, Some(commit_message)).await?;
    } else if let Some(path) = get_local_vault_path(state) {
        // Local vault - save to file
        save_vault_file_with_key(&path, vault, key, salt)?;
    }

    Ok(())
}

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
    let (group, vault, key, salt) = {
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
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    save_vault_changes(&state, &vault, &key, &salt, "Create group").await?;

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
    let (group, vault, key, salt) = {
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
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    save_vault_changes(&state, &vault, &key, &salt, "Update group").await?;

    Ok(group)
}

/// Delete a group
#[tauri::command]
pub async fn delete_group(
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let (vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

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
    save_vault_changes(&state, &vault, &key, &salt, "Delete group").await?;

    Ok(())
}
