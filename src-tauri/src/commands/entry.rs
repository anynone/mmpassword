//! Entry-related Tauri commands

use tauri::{Emitter, State};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::git::sync::{get_clone_dir, GitSyncEngine};
use crate::models::{CreateEntryRequest, Entry, UpdateEntryRequest};
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

/// Helper function to save vault changes with background Git sync.
///
/// Local vault: saves synchronously to file (fast operation).
/// Git vault: spawns a background tokio task to commit + push. Emits
/// `sync:started` / `sync:completed` / `sync:failed` events so the frontend
/// can surface sync status without blocking the command.
fn save_vault_changes_background(
    state: &State<'_, AppState>,
    app: &tauri::AppHandle,
    vault: crate::models::Vault,
    key: [u8; 32],
    salt: [u8; 16],
    commit_message: String,
) -> Result<()> {
    if let Some((repository, clone_dir)) = get_git_sync_info(state) {
        // Git vault - run the save operation in a background task so
        // the user sees the change applied immediately.
        let sync_lock = state.git_sync_lock.clone();
        let app_handle = app.clone();

        tauri::async_runtime::spawn(async move {
            let _ = app_handle.emit("sync:started", ());

            // Serialize git operations so overlapping background saves
            // don't step on each other inside the same clone.
            let _guard = sync_lock.lock().await;

            let engine = GitSyncEngine::new(repository, clone_dir);
            match engine
                .save_vault(&vault, &key, &salt, Some(&commit_message))
                .await
            {
                Ok(_new_sha) => {
                    let _ = app_handle.emit("sync:completed", ());
                }
                Err(e) => {
                    let _ = app_handle.emit("sync:failed", e.to_string());
                }
            }
        });
    } else if let Some(path) = get_local_vault_path(state) {
        // Local vault - save synchronously (fast, no network I/O).
        save_vault_file_with_key(&path, &vault, &key, &salt)?;
    }

    Ok(())
}

/// Get all entries
#[tauri::command]
pub async fn get_entries(
    state: State<'_, AppState>,
) -> Result<Vec<Entry>> {
    let session = state.session.read();
    let session = session.as_ref().ok_or(AppError::VaultLocked)?;

    Ok(session.vault.entries.clone())
}

/// Get entries by group
#[tauri::command]
pub async fn get_entries_by_group(
    group_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Entry>> {
    let session = state.session.read();
    let session = session.as_ref().ok_or(AppError::VaultLocked)?;

    let group_uuid = group_id.and_then(|id| Uuid::parse_str(&id).ok());

    Ok(session.vault.entries_by_group(group_uuid).cloned().collect())
}

/// Get favorite entries
#[tauri::command]
pub async fn get_favorite_entries(
    state: State<'_, AppState>,
) -> Result<Vec<Entry>> {
    let session = state.session.read();
    let session = session.as_ref().ok_or(AppError::VaultLocked)?;

    Ok(session.vault.favorite_entries().cloned().collect())
}

/// Get a single entry
#[tauri::command]
pub async fn get_entry(
    id: String,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let session = state.session.read();
    let session = session.as_ref().ok_or(AppError::VaultLocked)?;

    let uuid = Uuid::parse_str(&id)
        .map_err(|_| AppError::EntryNotFound(id.clone()))?;

    session.vault.get_entry(uuid)
        .cloned()
        .ok_or(AppError::EntryNotFound(id))
}

/// Create a new entry
#[tauri::command]
pub async fn create_entry(
    request: CreateEntryRequest,
    state: State<'_, AppState>,
) -> Result<Entry> {
    // Get session info and modify vault
    let (entry, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let mut entry = Entry::new(request.title, request.entry_type);
        entry.group_id = request.group_id;
        entry.fields = request.fields;
        entry.tags = request.tags;
        entry.favorite = request.favorite;

        session.vault.add_entry(entry.clone());

        (
            entry,
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    save_vault_changes(&state, &vault, &key, &salt, "Add new entry").await?;

    // Mark as clean
    {
        let mut session = state.session.write();
        if let Some(s) = session.as_mut() {
            s.dirty = false;
        }
    }

    Ok(entry)
}

/// Update an entry
#[tauri::command]
pub async fn update_entry(
    id: String,
    request: UpdateEntryRequest,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let (entry, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        if !session.vault.update_entry(uuid, request) {
            return Err(AppError::EntryNotFound(id));
        }

        let entry = session.vault.get_entry(uuid)
            .cloned()
            .ok_or(AppError::EntryNotFound(id.clone()))?;

        (
            entry,
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    save_vault_changes(&state, &vault, &key, &salt, "Update entry").await?;

    Ok(entry)
}

/// Move an entry to a different group.
///
/// Optimized for drag-and-drop: the in-memory vault is updated synchronously
/// so the UI responds immediately, while any Git sync (commit + push) runs in
/// a background task. The frontend is notified via `sync:*` events.
#[tauri::command]
pub async fn move_entry_to_group(
    id: String,
    group_id: Option<String>,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let (entry, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        // Clone the existing entry so we can build an UpdateEntryRequest
        // preserving every field except group_id.
        let existing = session
            .vault
            .get_entry(uuid)
            .cloned()
            .ok_or_else(|| AppError::EntryNotFound(id.clone()))?;

        let target_group = match group_id.as_deref() {
            Some(g) if !g.is_empty() => Some(
                Uuid::parse_str(g)
                    .map_err(|_| AppError::Unknown(format!("Invalid group id: {g}")))?,
            ),
            _ => None,
        };

        let request = UpdateEntryRequest {
            title: existing.title,
            group_id: target_group,
            fields: existing.fields,
            tags: existing.tags,
            favorite: existing.favorite,
        };

        if !session.vault.update_entry(uuid, request) {
            return Err(AppError::EntryNotFound(id));
        }

        let entry = session
            .vault
            .get_entry(uuid)
            .cloned()
            .ok_or_else(|| AppError::EntryNotFound(id.clone()))?;

        (
            entry,
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Persist: local vault saves synchronously (fast), Git vault syncs in
    // the background so the user doesn't wait on commit+push.
    save_vault_changes_background(&state, &app, vault, key, salt, "Move entry".to_string())?;

    Ok(entry)
}

/// Delete an entry (move to trash)
#[tauri::command]
pub async fn delete_entry(
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let (vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        if !session.vault.trash_entry(uuid) {
            return Err(AppError::EntryNotFound(id));
        }

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    save_vault_changes(&state, &vault, &key, &salt, "Delete entry").await?;

    Ok(())
}

/// Get trash entries
#[tauri::command]
pub async fn get_trash_entries(
    state: State<'_, AppState>,
) -> Result<Vec<Entry>> {
    let session = state.session.read();
    let session = session.as_ref().ok_or(AppError::VaultLocked)?;

    Ok(session.vault.trash.clone())
}

/// Restore entry from trash
#[tauri::command]
pub async fn restore_entry(
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let (vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        if !session.vault.restore_entry(uuid) {
            return Err(AppError::EntryNotFound(id));
        }

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    save_vault_changes(&state, &vault, &key, &salt, "Restore entry").await?;

    Ok(())
}

/// Permanently delete entry from trash
#[tauri::command]
pub async fn delete_entry_permanently(
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let (vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        if !session.vault.delete_entry_permanently(uuid) {
            return Err(AppError::EntryNotFound(id));
        }

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    save_vault_changes(&state, &vault, &key, &salt, "Permanently delete entry").await?;

    Ok(())
}

/// Empty trash
#[tauri::command]
pub async fn empty_trash(
    state: State<'_, AppState>,
) -> Result<()> {
    let (vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        session.vault.empty_trash();

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    save_vault_changes(&state, &vault, &key, &salt, "Empty trash").await?;

    Ok(())
}
