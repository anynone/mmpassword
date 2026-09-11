//! Shared helpers for addressing a vault session and persisting changes.
//!
//! All data commands take an explicit `vault_id` so operations always target
//! the intended session even when several vaults are open at the same time.

use std::path::PathBuf;

use tauri::Emitter;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::git::repository::GitRepository;
use crate::git::sync::{get_clone_dir, GitSyncEngine};
use crate::models::Vault;
use crate::state::AppState;
use crate::storage::save_vault_file_with_key;

/// Payload for the `sync:*` events; identifies which vault the event is about.
#[allow(non_snake_case)]
#[derive(Clone, serde::Serialize)]
pub struct SyncEventPayload {
    pub vaultId: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Parse a vault id string coming from the frontend
pub fn parse_vault_id(vault_id: &str) -> Result<Uuid> {
    Uuid::parse_str(vault_id)
        .map_err(|_| AppError::Unknown(format!("Invalid vault id: {vault_id}")))
}

/// Helper to extract Git sync info for a vault if available
pub fn get_git_sync_info(state: &AppState, vault_id: Uuid) -> Option<(GitRepository, PathBuf)> {
    let sessions = state.sessions.read();
    sessions
        .get(&vault_id)
        .and_then(|s| {
            s.git_sync.as_ref().map(|git_sync| {
                let clone_dir = get_clone_dir(&git_sync.repository.url).ok()?;
                Some((git_sync.repository.clone(), clone_dir))
            })
        })
        .flatten()
}

/// Helper to get the local vault path if the vault is not Git-synced
pub fn get_local_vault_path(state: &AppState, vault_id: Uuid) -> Option<PathBuf> {
    let sessions = state.sessions.read();
    sessions.get(&vault_id).and_then(|s| {
        if s.git_sync.is_none() {
            Some(s.path.clone())
        } else {
            None
        }
    })
}

/// Helper function to save vault - handles both local and Git vaults.
/// Returns the (possibly merged) vault so callers can update the session.
pub async fn save_vault_changes(
    state: &AppState,
    vault_id: Uuid,
    vault: &Vault,
    key: &[u8; 32],
    salt: &[u8; 16],
    commit_message: &str,
) -> Result<Vault> {
    if let Some((repository, clone_dir)) = get_git_sync_info(state, vault_id) {
        // Serialize git operations: multiple vaults may share one clone dir
        let _guard = state.git_sync_lock.lock().await;
        let engine = GitSyncEngine::new(repository, clone_dir);
        let (_sha, merged) = engine.save_vault(vault, key, salt, Some(commit_message)).await?;
        Ok(merged)
    } else if let Some(path) = get_local_vault_path(state, vault_id) {
        save_vault_file_with_key(&path, vault, key, salt)?;
        Ok(vault.clone())
    } else {
        Ok(vault.clone())
    }
}

/// Write a merged vault back into its session (no-op if the vault was locked
/// or closed while the save was running).
pub fn update_session_vault(state: &AppState, vault_id: Uuid, merged: Vault, set_clean: bool) {
    let mut sessions = state.sessions.write();
    if let Some(session) = sessions.get_mut(&vault_id) {
        if let Some(ref mut git_sync) = session.git_sync {
            git_sync.sync_state.local_hash = GitSyncEngine::calculate_vault_hash(&merged);
        }
        session.vault = merged;
        if set_clean {
            session.dirty = false;
        }
    }
}

/// Helper function to save vault changes with background Git sync.
///
/// Local vault: saves synchronously to file (fast operation).
/// Git vault: spawns a background tokio task to commit + push. Emits
/// `sync:started` / `sync:completed` / `sync:failed` events (carrying the
/// vault id) so the frontend can surface sync status per vault without
/// blocking the command.
pub fn save_vault_changes_background(
    state: &AppState,
    app: &tauri::AppHandle,
    vault_id: Uuid,
    vault: Vault,
    key: [u8; 32],
    salt: [u8; 16],
    commit_message: String,
) -> Result<()> {
    if let Some((repository, clone_dir)) = get_git_sync_info(state, vault_id) {
        let sync_lock = state.git_sync_lock.clone();
        let app_handle = app.clone();

        tauri::async_runtime::spawn(async move {
            let _ = app_handle.emit(
                "sync:started",
                SyncEventPayload {
                    vaultId: vault_id.to_string(),
                    error: None,
                },
            );

            let _guard = sync_lock.lock().await;

            let engine = GitSyncEngine::new(repository, clone_dir);
            match engine
                .save_vault(&vault, &key, &salt, Some(&commit_message))
                .await
            {
                Ok((_new_sha, merged)) => {
                    // Write the merged vault back if the session is still open
                    update_session_vault_bg(&app_handle, vault_id, merged);
                    let _ = app_handle.emit(
                        "sync:completed",
                        SyncEventPayload {
                            vaultId: vault_id.to_string(),
                            error: None,
                        },
                    );
                }
                Err(e) => {
                    let _ = app_handle.emit(
                        "sync:failed",
                        SyncEventPayload {
                            vaultId: vault_id.to_string(),
                            error: Some(e.to_string()),
                        },
                    );
                }
            }
        });
    } else if let Some(path) = get_local_vault_path(state, vault_id) {
        save_vault_file_with_key(&path, &vault, &key, &salt)?;
    }

    Ok(())
}

/// Background-task variant of [`update_session_vault`]: needs to reacquire
/// the state through the app handle because `State<'_, AppState>` is not
/// `'static`.
fn update_session_vault_bg(app: &tauri::AppHandle, vault_id: Uuid, merged: Vault) {
    use tauri::Manager;
    if let Some(state) = app.try_state::<AppState>() {
        update_session_vault(&state, vault_id, merged, true);
    }
}
