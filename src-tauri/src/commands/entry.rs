//! Entry-related Tauri commands

use tauri::State;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::models::{CreateEntryRequest, Entry, UpdateEntryRequest};
use crate::state::AppState;
use crate::storage::save_vault_file_with_key;

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
    let (entry, path, vault, key, salt) = {
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
            session.path.clone(),
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault to file
    save_vault_file_with_key(&path, &vault, &key, &salt)?;

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
    let (entry, path, vault, key, salt) = {
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
            session.path.clone(),
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault to file
    save_vault_file_with_key(&path, &vault, &key, &salt)?;

    Ok(entry)
}

/// Delete an entry (move to trash)
#[tauri::command]
pub async fn delete_entry(
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let (path, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        if !session.vault.trash_entry(uuid) {
            return Err(AppError::EntryNotFound(id));
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
    let (path, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        if !session.vault.restore_entry(uuid) {
            return Err(AppError::EntryNotFound(id));
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

/// Permanently delete entry from trash
#[tauri::command]
pub async fn delete_entry_permanently(
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let (path, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let uuid = Uuid::parse_str(&id)
            .map_err(|_| AppError::EntryNotFound(id.clone()))?;

        if !session.vault.delete_entry_permanently(uuid) {
            return Err(AppError::EntryNotFound(id));
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

/// Empty trash
#[tauri::command]
pub async fn empty_trash(
    state: State<'_, AppState>,
) -> Result<()> {
    let (path, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        session.vault.empty_trash();

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
