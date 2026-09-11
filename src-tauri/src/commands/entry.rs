//! Entry-related Tauri commands

use tauri::State;
use uuid::Uuid;

use crate::commands::session_utils::{
    parse_vault_id, save_vault_changes, save_vault_changes_background, update_session_vault,
};
use crate::error::{AppError, Result};
use crate::models::{CreateEntryRequest, Entry, UpdateEntryRequest};
use crate::state::AppState;

/// Get all entries
#[tauri::command]
pub async fn get_entries(
    vault_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Entry>> {
    let id = parse_vault_id(&vault_id)?;
    let sessions = state.sessions.read();
    let session = sessions.get(&id).ok_or(AppError::VaultLocked)?;

    Ok(session.vault.entries.clone())
}

/// Get entries by group
#[tauri::command]
pub async fn get_entries_by_group(
    vault_id: String,
    group_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Entry>> {
    let id = parse_vault_id(&vault_id)?;
    let sessions = state.sessions.read();
    let session = sessions.get(&id).ok_or(AppError::VaultLocked)?;

    let group_uuid = group_id.and_then(|gid| Uuid::parse_str(&gid).ok());

    Ok(session.vault.entries_by_group(group_uuid).cloned().collect())
}

/// Get favorite entries
#[tauri::command]
pub async fn get_favorite_entries(
    vault_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Entry>> {
    let id = parse_vault_id(&vault_id)?;
    let sessions = state.sessions.read();
    let session = sessions.get(&id).ok_or(AppError::VaultLocked)?;

    Ok(session.vault.favorite_entries().cloned().collect())
}

/// Get a single entry
#[tauri::command]
pub async fn get_entry(
    vault_id: String,
    id: String,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let vault_uuid = parse_vault_id(&vault_id)?;
    let sessions = state.sessions.read();
    let session = sessions.get(&vault_uuid).ok_or(AppError::VaultLocked)?;

    let uuid = Uuid::parse_str(&id)
        .map_err(|_| AppError::EntryNotFound(id.clone()))?;

    session.vault.get_entry(uuid)
        .cloned()
        .ok_or(AppError::EntryNotFound(id))
}

/// Create a new entry
#[tauri::command]
pub async fn create_entry(
    vault_id: String,
    request: CreateEntryRequest,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let id = parse_vault_id(&vault_id)?;

    // Get session info and modify vault
    let (entry, vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&id).ok_or(AppError::VaultLocked)?;

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
    let merged = save_vault_changes(&state, id, &vault, &key, &salt, "Add new entry").await?;

    // Update session with merged vault
    update_session_vault(&state, id, merged, true);

    Ok(entry)
}

/// Update an entry
#[tauri::command]
pub async fn update_entry(
    vault_id: String,
    id: String,
    request: UpdateEntryRequest,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (entry, vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

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
    let merged = save_vault_changes(&state, vault_uuid, &vault, &key, &salt, "Update entry").await?;

    // Update session with merged vault
    update_session_vault(&state, vault_uuid, merged, false);

    Ok(entry)
}

/// Move an entry to a different group.
///
/// Optimized for drag-and-drop: the in-memory vault is updated synchronously
/// so the UI responds immediately, while any Git sync (commit + push) runs in
/// a background task. The frontend is notified via `sync:*` events.
#[tauri::command]
pub async fn move_entry_to_group(
    vault_id: String,
    id: String,
    group_id: Option<String>,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Entry> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (entry, vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

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
    save_vault_changes_background(&state, &app, vault_uuid, vault, key, salt, "Move entry".to_string())?;

    Ok(entry)
}

/// Delete an entry (move to trash)
#[tauri::command]
pub async fn delete_entry(
    vault_id: String,
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

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
    let merged = save_vault_changes(&state, vault_uuid, &vault, &key, &salt, "Delete entry").await?;

    // Update session with merged vault
    update_session_vault(&state, vault_uuid, merged, false);

    Ok(())
}

/// Get trash entries
#[tauri::command]
pub async fn get_trash_entries(
    vault_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Entry>> {
    let id = parse_vault_id(&vault_id)?;
    let sessions = state.sessions.read();
    let session = sessions.get(&id).ok_or(AppError::VaultLocked)?;

    Ok(session.vault.trash.clone())
}

/// Restore entry from trash
#[tauri::command]
pub async fn restore_entry(
    vault_id: String,
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

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
    let merged = save_vault_changes(&state, vault_uuid, &vault, &key, &salt, "Restore entry").await?;

    // Update session with merged vault
    update_session_vault(&state, vault_uuid, merged, false);

    Ok(())
}

/// Permanently delete entry from trash
#[tauri::command]
pub async fn delete_entry_permanently(
    vault_id: String,
    id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

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
    let merged = save_vault_changes(&state, vault_uuid, &vault, &key, &salt, "Permanently delete entry").await?;

    // Update session with merged vault
    update_session_vault(&state, vault_uuid, merged, false);

    Ok(())
}

/// Empty trash
#[tauri::command]
pub async fn empty_trash(
    vault_id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let vault_uuid = parse_vault_id(&vault_id)?;

    let (vault, key, salt) = {
        let mut sessions = state.sessions.write();
        let session = sessions.get_mut(&vault_uuid).ok_or(AppError::VaultLocked)?;

        session.vault.empty_trash();

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
        )
    };

    // Save vault changes
    let merged = save_vault_changes(&state, vault_uuid, &vault, &key, &salt, "Empty trash").await?;

    // Update session with merged vault
    update_session_vault(&state, vault_uuid, merged, false);

    Ok(())
}
