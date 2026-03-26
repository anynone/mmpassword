//! Vault-related Tauri commands

use std::path::PathBuf;

use tauri::State;

use crate::crypto::{derive_key, generate_salt, KdfParams};
use crate::error::{AppError, Result};
use crate::models::{GitRepoMeta, Vault, VaultMeta};
use crate::state::AppState;
use crate::storage::{create_vault_file_with_key, open_vault_file_with_key, AppConfig};

/// Create a new vault
#[tauri::command]
pub async fn create_vault(
    name: String,
    password: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<Vault> {
    // Validate password strength
    if password.len() < 8 {
        return Err(AppError::PasswordTooShort(8));
    }

    let path_buf = PathBuf::from(&path);

    // Create vault
    let vault = Vault::new(&name);

    // Generate salt for key derivation
    let salt = generate_salt();

    // Derive key for encryption
    let derived_key = derive_key(&password, &salt, &KdfParams::default())?;
    let key = derived_key.into_array()?;

    // Save to file using the same salt
    create_vault_file_with_key(&path_buf, &vault, &key, &salt)?;

    // Set session
    state.set_session(vault.clone(), path_buf.clone(), key, salt);

    // Update config
    {
        let mut config = state.config.write().await;
        let meta = VaultMeta::new(&path, &name);
        config.add_recent_vault(meta);
        config.set_last_vault(&path);
        let _ = config.save();
    }

    Ok(vault)
}

/// Open a vault file (returns metadata, vault is still locked)
#[tauri::command]
pub async fn open_vault(
    path: String,
) -> Result<VaultMeta> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(AppError::VaultNotFound(path));
    }

    // Read vault metadata from file header
    let file_data = std::fs::read(&path_buf)?;
    if file_data.len() < 8 {
        return Err(AppError::InvalidFileFormat);
    }

    // Check magic number
    if &file_data[0..4] != b"MMP1" {
        return Err(AppError::InvalidFileFormat);
    }

    // For now, return basic metadata
    // In a full implementation, we might store the vault name in the header
    let name = path_buf
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Vault".to_string());

    Ok(VaultMeta::new(&path, &name))
}

/// Unlock a vault with master password
#[tauri::command]
pub async fn unlock_vault(
    path: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<Vault> {
    let path_buf = PathBuf::from(&path);

    // Open and decrypt vault, returns vault, key, and salt
    let (vault, key, salt) = open_vault_file_with_key(&path_buf, &password)?;

    // Set session
    state.set_session(vault.clone(), path_buf.clone(), key, salt);

    // Update config
    {
        let mut config = state.config.write().await;
        let meta = VaultMeta::new(&path, &vault.name);
        config.add_recent_vault(meta);
        config.set_last_vault(&path);
        let _ = config.save();
    }

    Ok(vault)
}

/// Lock the current vault
#[tauri::command]
pub async fn lock_vault(
    state: State<'_, AppState>,
) -> Result<()> {
    state.clear_session();
    Ok(())
}

/// Save the current vault
#[tauri::command]
pub async fn save_vault(
    state: State<'_, AppState>,
) -> Result<()> {
    let session = state.session.read();
    let _session = session.as_ref().ok_or(AppError::VaultLocked)?;

    // For now, we need the password to save
    // In a full implementation, we would store the key or use a different approach
    // This is a simplified version

    Err(AppError::Unknown("Save requires password re-entry in this version".into()))
}

/// Get the current vault state
#[tauri::command]
pub async fn get_current_vault(
    state: State<'_, AppState>,
) -> Result<Option<Vault>> {
    Ok(state.get_vault())
}

/// Check if vault is unlocked
#[tauri::command]
pub async fn is_vault_unlocked(
    state: State<'_, AppState>,
) -> Result<bool> {
    Ok(state.is_unlocked())
}

/// Get recent vaults
#[tauri::command]
pub async fn get_recent_vaults(
    state: State<'_, AppState>,
) -> Result<Vec<VaultMeta>> {
    let config = state.config.read().await;
    Ok(config.recent_vaults.clone())
}

/// Remove vault from recent list
#[tauri::command]
pub async fn remove_recent_vault(
    path: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut config = state.config.write().await;
    config.remove_recent_vault(&path);
    let _ = config.save();
    Ok(())
}

/// Get application config
#[tauri::command]
pub async fn get_config(
    state: State<'_, AppState>,
) -> Result<AppConfig> {
    let config = state.config.read().await;
    Ok(config.clone())
}

/// Update application config
#[tauri::command]
pub async fn update_config(
    config: AppConfig,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut current_config = state.config.write().await;
    *current_config = config;
    let _ = current_config.save();
    Ok(())
}

/// Get recent Git repositories
#[tauri::command]
pub async fn get_recent_git_repos(
    state: State<'_, AppState>,
) -> Result<Vec<GitRepoMeta>> {
    let config = state.config.read().await;
    Ok(config.recent_git_repos.clone())
}

/// Add Git repository to recent list
#[tauri::command]
pub async fn add_recent_git_repo(
    repo_url: String,
    branch: String,
    key_path: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut config = state.config.write().await;
    let meta = GitRepoMeta::new(repo_url, branch, key_path);
    config.add_recent_git_repo(meta);
    let _ = config.save();
    Ok(())
}

/// Remove Git repository from recent list
#[tauri::command]
pub async fn remove_recent_git_repo(
    repo_url: String,
    branch: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut config = state.config.write().await;
    config.remove_recent_git_repo(&repo_url, &branch);
    let _ = config.save();
    Ok(())
}
