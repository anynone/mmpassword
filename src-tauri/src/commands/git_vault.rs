//! Git vault operations commands

use std::path::PathBuf;

use tauri::State;

use crate::commands::session_utils::parse_vault_id;
use crate::error::{AppError, Result};
use crate::git::repository::GitRepository;
use crate::git::sync::{get_clone_dir, GitSyncEngine, GitSyncResult};
use crate::models::Vault;
use crate::state::AppState;

/// List all vault files in a Git repository
#[tauri::command]
pub async fn list_git_vaults(
    repo_url: String,
    branch: String,
    key_path: String,
) -> Result<Vec<String>> {
    let ssh_config = crate::git::ssh_config::SshKeyConfig::new(expand_tilde(&key_path));
    // Use a placeholder vault_path since we're listing all vaults
    let repository = GitRepository::with_options(
        repo_url,
        branch,
        "placeholder.mmp".to_string(),
        ssh_config,
    );

    let clone_dir = get_clone_dir(&repository.url)?;
    let engine = GitSyncEngine::new(repository, clone_dir);

    engine.list_vaults().await
}

/// Check if a vault exists in a Git repository
#[tauri::command]
pub async fn git_vault_exists(
    repo_url: String,
    branch: String,
    vault_path: String,
    key_path: String,
) -> Result<bool> {
    let ssh_config = crate::git::ssh_config::SshKeyConfig::new(expand_tilde(&key_path));
    let repository = GitRepository::with_options(
        repo_url,
        branch,
        vault_path,
        ssh_config,
    );

    let clone_dir = get_clone_dir(&repository.url)?;
    let engine = GitSyncEngine::new(repository, clone_dir);

    engine.vault_exists().await
}

/// Open a vault from a Git repository
#[tauri::command]
pub async fn open_git_vault(
    state: State<'_, AppState>,
    repo_url: String,
    branch: String,
    vault_path: String,
    key_path: String,
    password: String,
) -> Result<Vault> {
    let expanded_key_path = expand_tilde(&key_path);
    let ssh_config = crate::git::ssh_config::SshKeyConfig::new(expanded_key_path.clone());
    let repository = GitRepository::with_options(
        repo_url.clone(),
        branch.clone(),
        vault_path.clone(),
        ssh_config,
    );

    let clone_dir = get_clone_dir(&repo_url)?;
    let engine = GitSyncEngine::new(repository.clone(), clone_dir);

    // Open vault from Git
    let (vault, key, salt) = engine.open_vault(&password).await?;
    let commit_sha = engine.get_current_commit().await?;
    let local_hash = GitSyncEngine::calculate_vault_hash(&vault);

    // Create sync state
    let sync_state = crate::git::repository::GitSyncState::new(commit_sha, local_hash);

    // Set session with Git sync info
    state.set_session_with_git(
        vault.clone(),
        PathBuf::from(format!("git://{}/{}", repo_url, vault_path)),
        key,
        salt,
        repository,
        sync_state,
    );

    // Save to recent git repos
    {
        let mut config = state.config.write().await;
        let git_meta = crate::models::GitRepoMeta::new(
            repo_url.clone(),
            branch.clone(),
            key_path.clone(),
        );
        let repo_name = git_meta.repo_name.clone();
        config.add_recent_git_repo(git_meta);
        // Remember this as the last-opened vault so auto-open on startup works.
        let last_git = crate::storage::LastGitVault {
            repo_url,
            branch,
            vault_path,
            key_path,
            repo_name,
        };
        config.set_last_git_vault(last_git.clone());
        config.add_open_vault(crate::storage::OpenVaultTarget::git(last_git));
        let _ = config.save();
    }

    Ok(vault)
}

/// Create a new vault in a Git repository
#[tauri::command]
pub async fn create_git_vault(
    state: State<'_, AppState>,
    repo_url: String,
    branch: String,
    vault_path: String,
    key_path: String,
    name: String,
    password: String,
) -> Result<Vault> {
    let expanded_key_path = expand_tilde(&key_path);
    let ssh_config = crate::git::ssh_config::SshKeyConfig::new(expanded_key_path.clone());
    let repository = GitRepository::with_options(
        repo_url.clone(),
        branch.clone(),
        vault_path.clone(),
        ssh_config,
    );

    let clone_dir = get_clone_dir(&repo_url)?;
    let engine = GitSyncEngine::new(repository.clone(), clone_dir);

    // Create new vault
    let vault = Vault::new(&name);

    // Generate key and salt
    let salt = crate::crypto::random_salt();
    let derived_key = crate::crypto::derive_key(
        &password,
        &salt,
        &crate::crypto::KdfParams::default(),
    )?;
    let key = derived_key.into_array()?;

    // Save to Git
    let (commit_sha, _merged) = engine
        .save_vault(&vault, &key, &salt, Some(&format!("Create vault: {}", name)))
        .await?;
    let local_hash = GitSyncEngine::calculate_vault_hash(&vault);

    // Create sync state
    let sync_state = crate::git::repository::GitSyncState::new(commit_sha, local_hash);

    // Set session with Git sync info
    state.set_session_with_git(
        vault.clone(),
        PathBuf::from(format!("git://{}/{}", repo_url, vault_path)),
        key,
        salt,
        repository,
        sync_state,
    );

    // Save to recent git repos
    {
        let mut config = state.config.write().await;
        let git_meta = crate::models::GitRepoMeta::new(
            repo_url.clone(),
            branch.clone(),
            key_path.clone(),
        );
        let repo_name = git_meta.repo_name.clone();
        config.add_recent_git_repo(git_meta);
        // Remember this as the last-opened vault so auto-open on startup works.
        let last_git = crate::storage::LastGitVault {
            repo_url,
            branch,
            vault_path,
            key_path,
            repo_name,
        };
        config.set_last_git_vault(last_git.clone());
        config.add_open_vault(crate::storage::OpenVaultTarget::git(last_git));
        let _ = config.save();
    }

    Ok(vault)
}

/// Save vault to Git (pull + merge + commit + push)
#[tauri::command]
pub async fn save_git_vault(
    vault_id: String,
    state: State<'_, AppState>,
    commit_message: Option<String>,
) -> Result<String> {
    let id = parse_vault_id(&vault_id)?;

    // Get session info
    let (vault, key, salt, repository) = {
        let sessions = state.sessions.read();
        let session = sessions.get(&id).ok_or(AppError::VaultLocked)?;

        let git_sync = session
            .git_sync
            .as_ref()
            .ok_or_else(|| AppError::GitError("Not a Git vault".to_string()))?;

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
            git_sync.repository.clone(),
        )
    };

    let clone_dir = get_clone_dir(&repository.url)?;
    let engine = GitSyncEngine::new(repository, clone_dir);

    let message = commit_message.as_deref().unwrap_or("Update vault");
    // Serialize git operations: multiple vaults may share one clone dir
    let _guard = state.git_sync_lock.lock().await;
    let (new_sha, merged) = engine.save_vault(&vault, &key, &salt, Some(message)).await?;
    drop(_guard);

    // Update session with merged vault and sync state
    {
        let mut sessions = state.sessions.write();
        if let Some(session) = sessions.get_mut(&id) {
            session.vault = merged;
            session.dirty = false;
            if let Some(ref mut git_sync) = session.git_sync {
                git_sync.sync_state.last_commit_sha = new_sha.clone();
                git_sync.sync_state.local_hash = GitSyncEngine::calculate_vault_hash(&session.vault);
                git_sync.sync_state.last_sync_at = chrono::Utc::now();
            }
        }
    }

    Ok(new_sha)
}

/// Sync vault with Git (pull + merge + push)
#[tauri::command]
pub async fn sync_git_vault(
    vault_id: String,
    state: State<'_, AppState>,
    password: String,
) -> Result<GitSyncResult> {
    let id = parse_vault_id(&vault_id)?;

    // Get session info
    let (mut vault, key, salt, repository, sync_state) = {
        let sessions = state.sessions.read();
        let session = sessions.get(&id).ok_or(AppError::VaultLocked)?;

        let git_sync = session
            .git_sync
            .as_ref()
            .ok_or_else(|| AppError::GitError("Not a Git vault".to_string()))?;

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
            git_sync.repository.clone(),
            git_sync.sync_state.clone(),
        )
    };

    let clone_dir = get_clone_dir(&repository.url)?;
    let engine = GitSyncEngine::new(repository.clone(), clone_dir);

    // Perform sync (save_vault now handles pull-merge-push internally);
    // serialize git operations across vaults sharing a clone dir
    let _guard = state.git_sync_lock.lock().await;
    let result = engine.sync(&mut vault, &password, &sync_state, &key, &salt).await?;
    drop(_guard);

    // Update session with merged vault
    {
        let mut sessions = state.sessions.write();
        if let Some(session) = sessions.get_mut(&id) {
            session.vault = vault;
            session.dirty = false;
            if let Some(ref mut git_sync) = session.git_sync {
                if let Some(ref new_sha) = result.new_commit_sha {
                    git_sync.sync_state.last_commit_sha = new_sha.clone();
                }
                git_sync.sync_state.local_hash = GitSyncEngine::calculate_vault_hash(&session.vault);
                git_sync.sync_state.last_sync_at = chrono::Utc::now();
            }
        }
    }

    Ok(result)
}

/// Get Git sync status
#[tauri::command]
pub async fn get_git_sync_status(
    vault_id: String,
    state: State<'_, AppState>,
) -> Result<Option<GitSyncResult>> {
    let id = parse_vault_id(&vault_id)?;

    // Extract needed data from session first to avoid holding lock across await
    let repo_info = {
        let sessions = state.sessions.read();
        sessions.get(&id).and_then(|s| {
            s.git_sync.as_ref().map(|gs| {
                (gs.repository.clone(), gs.sync_state.local_hash.clone())
            })
        })
    };

    if let Some((repository, _local_hash)) = repo_info {
        let clone_dir = get_clone_dir(&repository.url)?;
        let engine = GitSyncEngine::new(repository, clone_dir);

        let commit_sha = engine.get_current_commit().await?;

        return Ok(Some(GitSyncResult {
            success: true,
            entries_pulled: 0,
            entries_pushed: 0,
            conflicts: 0,
            new_commit_sha: Some(commit_sha),
            error: None,
        }));
    }

    Ok(None)
}

/// Pull vault from Git (fetch remote changes, decrypt, update session)
#[tauri::command]
pub async fn pull_git_vault(vault_id: String, state: State<'_, AppState>) -> Result<Vault> {
    let id = parse_vault_id(&vault_id)?;

    // Extract needed data from session first to avoid holding lock across await
    let (repository, key, salt) = {
        let sessions = state.sessions.read();
        let session = sessions.get(&id).ok_or(AppError::VaultLocked)?;

        let git_sync = session
            .git_sync
            .as_ref()
            .ok_or_else(|| AppError::GitError("Not a Git vault".to_string()))?;

        (
            git_sync.repository.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    let clone_dir = get_clone_dir(&repository.url)?;
    let engine = GitSyncEngine::new(repository.clone(), clone_dir);

    // Pull remote changes; serialize git operations across vaults
    let _guard = state.git_sync_lock.lock().await;
    let new_commit = engine.pull().await?;
    drop(_guard);

    // Re-open (decrypt) the vault from the updated clone using existing key
    let vault_path = engine.vault_path();
    let (vault, _, _) = crate::storage::open_vault_file_with_key_raw(&vault_path, &key, &salt)?;

    let local_hash = GitSyncEngine::calculate_vault_hash(&vault);

    // Update session with new vault and sync state
    {
        let mut sessions = state.sessions.write();
        if let Some(session) = sessions.get_mut(&id) {
            session.vault = vault.clone();
            session.dirty = false;
            if let Some(ref mut git_sync) = session.git_sync {
                git_sync.sync_state.last_commit_sha = new_commit;
                git_sync.sync_state.local_hash = local_hash;
                git_sync.sync_state.last_sync_at = chrono::Utc::now();
            }
        }
    }

    Ok(vault)
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
