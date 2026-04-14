//! TOTP/MFA verification code commands

use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::State;
use totp_rs::{Algorithm, Secret, TOTP};
use url::Url;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::git::sync::{get_clone_dir, GitSyncEngine};
use crate::models::Entry;
use crate::state::AppState;
use crate::storage::save_vault_file_with_key;

/// TOTP verification code result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TotpCode {
    /// 6-digit verification code
    pub code: String,
    /// Seconds remaining in current period (0-30)
    pub remaining_seconds: u32,
}

/// Parse otpauth:// URI and extract the base32 secret
fn parse_otpauth_uri(uri: &str) -> std::result::Result<String, String> {
    let url = Url::parse(uri).map_err(|e| format!("Invalid URI: {}", e))?;

    if url.scheme() != "otpauth" {
        return Err("Not an otpauth URI".into());
    }

    let secret = url
        .query_pairs()
        .find(|(k, _)| k == "secret")
        .map(|(_, v)| v.to_string())
        .ok_or("Missing 'secret' parameter in otpauth URI")?;

    // Validate the secret
    Secret::Encoded(secret.clone())
        .to_bytes()
        .map_err(|e| format!("Invalid secret in URI: {}", e))?;

    Ok(secret)
}

/// Generate a TOTP verification code from a base32 secret
#[tauri::command]
pub fn generate_totp(secret: String) -> std::result::Result<TotpCode, String> {
    // If input looks like otpauth URI, parse it first
    let base32_secret = if secret.starts_with("otpauth://") {
        parse_otpauth_uri(&secret)?
    } else {
        secret
    };

    let totp_secret = Secret::Encoded(base32_secret)
        .to_bytes()
        .map_err(|e| format!("Invalid secret: {}", e))?;

    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30, totp_secret)
        .map_err(|e| format!("TOTP init failed: {}", e))?;

    let code = totp
        .generate_current()
        .map_err(|e| format!("TOTP generation failed: {}", e))?;

    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let remaining = 30 - (time % 30) as u32;

    Ok(TotpCode {
        code,
        remaining_seconds: remaining,
    })
}

/// Set TOTP secret for an entry
#[tauri::command]
pub async fn set_totp_secret(
    id: String,
    secret: String,
    state: State<'_, AppState>,
) -> Result<Entry> {
    // Resolve the base32 secret (parse otpauth URI if needed)
    let base32_secret = if secret.starts_with("otpauth://") {
        parse_otpauth_uri(&secret).map_err(|e| AppError::Unknown(e))?
    } else {
        Secret::Encoded(secret.clone())
            .to_bytes()
            .map_err(|e| AppError::Unknown(format!("Invalid base32 secret: {}", e)))?;
        secret
    };

    // Pre-validate by generating a code
    generate_totp(base32_secret.clone())
        .map_err(|e| AppError::Unknown(format!("TOTP validation failed: {}", e)))?;

    // Update entry in vault
    let (entry, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let entry_id = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        let entry = session
            .vault
            .get_entry_mut(entry_id)
            .ok_or_else(|| AppError::EntryNotFound(id.clone()))?;

        entry.totp_secret = Some(base32_secret);
        entry.updated_at = chrono::Utc::now();

        let entry_clone = entry.clone();
        (
            entry_clone,
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault (follow Git Vault Save Pattern)
    save_vault_changes(&state, &vault, &key, &salt, "Set TOTP secret").await?;

    Ok(entry)
}

/// Remove TOTP secret from an entry
#[tauri::command]
pub async fn remove_totp_secret(
    id: String,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let (entry, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let entry_id = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        let entry = session
            .vault
            .get_entry_mut(entry_id)
            .ok_or_else(|| AppError::EntryNotFound(id.clone()))?;

        entry.totp_secret = None;
        entry.updated_at = chrono::Utc::now();

        let entry_clone = entry.clone();
        (
            entry_clone,
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    save_vault_changes(&state, &vault, &key, &salt, "Remove TOTP secret").await?;

    Ok(entry)
}

/// Helper: extract Git sync info if available
fn get_git_sync_info(
    state: &State<'_, AppState>,
) -> Option<(crate::git::repository::GitRepository, std::path::PathBuf)> {
    let session = state.session.read();
    session.as_ref().and_then(|s| {
        s.git_sync.as_ref().map(|git_sync| {
            let clone_dir = get_clone_dir(&git_sync.repository.url).ok()?;
            Some((git_sync.repository.clone(), clone_dir))
        })
    }).flatten()
}

/// Helper: get local vault path if available
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

/// Helper: save vault changes (local or Git)
async fn save_vault_changes(
    state: &State<'_, AppState>,
    vault: &crate::models::Vault,
    key: &[u8; 32],
    salt: &[u8; 16],
    commit_message: &str,
) -> Result<()> {
    if let Some((repository, clone_dir)) = get_git_sync_info(state) {
        let engine = GitSyncEngine::new(repository, clone_dir);
        engine
            .save_vault(vault, key, salt, Some(commit_message))
            .await?;
    } else if let Some(path) = get_local_vault_path(state) {
        save_vault_file_with_key(&path, vault, key, salt)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_otpauth_uri_valid() {
        // base32 of "12345678901234567890" (20 bytes = 160 bits)
        let uri = "otpauth://totp/Test?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=TestApp";
        let result = parse_otpauth_uri(uri);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    }

    #[test]
    fn test_parse_otpauth_uri_missing_secret() {
        let uri = "otpauth://totp/Test?issuer=TestApp";
        let result = parse_otpauth_uri(uri);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Missing"));
    }

    #[test]
    fn test_parse_otpauth_uri_invalid_secret() {
        let uri = "otpauth://totp/Test?secret=!!!INVALID!!!";
        let result = parse_otpauth_uri(uri);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_otpauth_uri_not_otpauth() {
        let result = parse_otpauth_uri("https://example.com");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Not an otpauth"));
    }

    #[test]
    fn test_generate_totp_valid_secret() {
        // RFC 6238 test vector secret (base32 of "12345678901234567890")
        let secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ".to_string();
        let result = generate_totp(secret);
        assert!(result.is_ok());
        let totp_code = result.unwrap();
        assert_eq!(totp_code.code.len(), 6);
        assert!(totp_code.remaining_seconds <= 30);
    }

    #[test]
    fn test_generate_totp_invalid_secret() {
        let result = generate_totp("!!!INVALID!!!".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_totp_from_otpauth_uri() {
        let uri = "otpauth://totp/Test?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ".to_string();
        let result = generate_totp(uri);
        assert!(result.is_ok());
        let totp_code = result.unwrap();
        assert_eq!(totp_code.code.len(), 6);
    }

    #[test]
    fn test_remaining_seconds_range() {
        let secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ".to_string();
        let result = generate_totp(secret).unwrap();
        assert!(result.remaining_seconds > 0);
        assert!(result.remaining_seconds <= 30);
    }
}
