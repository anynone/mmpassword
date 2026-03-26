//! Git configuration commands

use std::path::PathBuf;

use tauri::State;

use crate::error::Result;
use crate::git::operations::GitOperations;
use crate::git::repository::{GitAccessValidation, GitRepository};
use crate::git::ssh_config::{DetectedSshKey, SshKeyValidation};
use crate::state::AppState;

/// Detect SSH keys in the system
#[tauri::command]
pub async fn detect_ssh_keys() -> Result<Vec<DetectedSshKey>> {
    GitOperations::detect_ssh_keys().await
}

/// Validate an SSH key
#[tauri::command]
pub async fn validate_ssh_key(key_path: String) -> Result<SshKeyValidation> {
    let path = expand_tilde(&key_path);
    GitOperations::validate_ssh_key(&path).await
}

/// Validate Git repository access
#[tauri::command]
pub async fn validate_git_access(
    repo_url: String,
    key_path: String,
) -> Result<GitAccessValidation> {
    let expanded_path = expand_tilde(&key_path);
    let git_ops = GitOperations::new(expanded_path);
    git_ops.validate_git_access(&repo_url).await
}

/// Save Git repository configuration
#[tauri::command]
pub async fn save_git_repository_config(
    state: State<'_, AppState>,
    repository: GitRepository,
) -> Result<()> {
    // Store the repository config in the app state
    let mut session = state.session.write();
    if let Some(session) = session.as_mut() {
        // Create a new GitSyncSession with default state
        let sync_state = crate::git::repository::GitSyncState::new(
            String::new(),
            String::new(),
        );
        session.git_sync = Some(crate::state::GitSyncSession {
            repository,
            sync_state,
        });
    }
    Ok(())
}

/// Get current Git repository configuration
#[tauri::command]
pub async fn get_git_repository_config(
    state: State<'_, AppState>,
) -> Result<Option<GitRepository>> {
    let session = state.session.read();
    Ok(session.as_ref().and_then(|s| {
        s.git_sync.as_ref().map(|gs| gs.repository.clone())
    }))
}

/// Expand tilde in path
fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with("~") {
        if let Some(home) = dirs::home_dir() {
            let rest = path.strip_prefix("~").unwrap_or(path);
            let rest = rest.strip_prefix("/").unwrap_or(rest);
            return home.join(rest);
        }
    }
    PathBuf::from(path)
}
