//! Subscription-related Tauri commands

use base64::Engine;
use tauri::State;

use crate::error::Result;
use crate::models::{SubscriptionMeta, Vault};
use crate::state::AppState;
use crate::storage::{decrypt_vault_from_bytes, get_subscription_password};

/// Fetch a subscription vault from a URL
#[tauri::command]
pub async fn fetch_subscription_vault(
    url: String,
    state: State<'_, AppState>,
) -> Result<Vault> {
    // HTTP GET request
    let response = reqwest::get(&url).await.map_err(|e| {
        crate::error::AppError::NetworkError(format!("Failed to fetch subscription: {}", e))
    })?;

    // Check HTTP status
    if !response.status().is_success() {
        let status = response.status();
        return Err(crate::error::AppError::NetworkError(format!(
            "Server returned error: {} {}",
            status.as_u16(),
            status.canonical_reason().unwrap_or("Unknown")
        )));
    }

    // Get response body as text (base64 encoded)
    let body = response.text().await.map_err(|e| {
        crate::error::AppError::NetworkError(format!("Failed to read response: {}", e))
    })?;

    // Base64 decode
    let data = base64::engine::general_purpose::STANDARD
        .decode(body.trim())
        .map_err(|_e| {
            crate::error::AppError::InvalidFileFormat
        })?;

    // Decrypt using shared password
    let password = get_subscription_password();
    let vault = decrypt_vault_from_bytes(&data, password)?;

    // Store in memory
    {
        let mut sub_vault = state.subscription_vault.write();
        *sub_vault = Some(vault.clone());
    }

    // Update subscription history in config
    {
        let mut config = state.config.write().await;
        let meta = SubscriptionMeta::new(
            url,
            vault.name.clone(),
            vault.entries.len(),
        );
        config.add_subscription_history(meta);
        let _ = config.save();
    }

    Ok(vault)
}

/// Get the current subscription vault (if loaded)
#[tauri::command]
pub async fn get_subscription_vault(
    state: State<'_, AppState>,
) -> Result<Option<Vault>> {
    let sub_vault = state.subscription_vault.read();
    Ok(sub_vault.clone())
}

/// Get subscription URL history
#[tauri::command]
pub async fn get_subscription_history(
    state: State<'_, AppState>,
) -> Result<Vec<SubscriptionMeta>> {
    let config = state.config.read().await;
    Ok(config.subscription_history.clone())
}

/// Remove a subscription URL from history
#[tauri::command]
pub async fn remove_subscription_history(
    url: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut config = state.config.write().await;
    config.remove_subscription_history(&url);
    let _ = config.save();
    Ok(())
}

/// Clear the current subscription vault from memory
#[tauri::command]
pub async fn clear_subscription(
    state: State<'_, AppState>,
) -> Result<()> {
    let mut sub_vault = state.subscription_vault.write();
    *sub_vault = None;
    Ok(())
}
