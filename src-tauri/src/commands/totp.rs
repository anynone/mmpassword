//! TOTP/MFA verification code commands

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::State;
use totp_rs::{Algorithm, Secret, TOTP};
use url::Url;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::git::sync::{get_clone_dir, GitSyncEngine};
use crate::models::{Entry, Field, FieldType, Vault};
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MigrationAlgorithm {
    Unspecified,
    Sha1,
    Sha256,
    Sha512,
    Md5,
    Unknown(i64),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MigrationOtpType {
    Unspecified,
    Hotp,
    Totp,
    Unknown(i64),
}

#[derive(Debug, Clone)]
struct MigrationOtp {
    secret: String,
    name: String,
    issuer: String,
    algorithm: MigrationAlgorithm,
    digits: u32,
    otp_type: MigrationOtpType,
}

/// A preview row returned before importing Google Authenticator accounts.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleAuthenticatorImportItem {
    pub index: usize,
    pub name: String,
    pub issuer: String,
    pub label: String,
    pub algorithm: String,
    pub digits: u32,
    pub otp_type: String,
    pub supported: bool,
    pub unsupported_reason: Option<String>,
    pub suggested_entry_id: Option<String>,
    pub suggested_entry_title: Option<String>,
    pub suggested_entry_has_totp: bool,
}

/// The user's import choice for one Google Authenticator account.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TotpImportDecision {
    pub index: usize,
    /// "update", "create", or "skip"
    pub action: String,
    pub entry_id: Option<String>,
    pub title: Option<String>,
}

/// Result returned after a batch TOTP import.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TotpImportResult {
    pub vault: Vault,
    pub imported_count: usize,
    pub updated_count: usize,
    pub created_count: usize,
    pub skipped_count: usize,
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

fn parse_google_authenticator_migration_uri(
    uri: &str,
) -> std::result::Result<Vec<MigrationOtp>, String> {
    let url = Url::parse(uri).map_err(|e| format!("Invalid URI: {}", e))?;

    if url.scheme() != "otpauth-migration" {
        return Err("Not a Google Authenticator migration URI".into());
    }

    let data = url
        .query_pairs()
        .find(|(k, _)| k == "data")
        .map(|(_, v)| v.to_string())
        .ok_or("Missing 'data' parameter in migration URI")?;

    let payload = decode_migration_payload(&data)?;
    parse_migration_payload(&payload)
}

fn decode_migration_payload(data: &str) -> std::result::Result<Vec<u8>, String> {
    let normalized = data.trim().replace(' ', "+");
    general_purpose::STANDARD
        .decode(normalized.as_bytes())
        .or_else(|_| general_purpose::URL_SAFE.decode(normalized.as_bytes()))
        .or_else(|_| general_purpose::URL_SAFE_NO_PAD.decode(normalized.as_bytes()))
        .map_err(|e| format!("Invalid migration payload encoding: {}", e))
}

fn parse_migration_payload(payload: &[u8]) -> std::result::Result<Vec<MigrationOtp>, String> {
    let mut pos = 0;
    let mut accounts = Vec::new();

    while pos < payload.len() {
        let key = read_varint(payload, &mut pos)?;
        let field_number = key >> 3;
        let wire_type = (key & 0x07) as u8;

        match (field_number, wire_type) {
            (1, 2) => {
                let value = read_len_delimited(payload, &mut pos)?;
                accounts.push(parse_migration_otp(value)?);
            }
            _ => skip_field(wire_type, payload, &mut pos)?,
        }
    }

    if accounts.is_empty() {
        return Err("Migration payload does not contain any accounts".into());
    }

    Ok(accounts)
}

fn parse_migration_otp(data: &[u8]) -> std::result::Result<MigrationOtp, String> {
    let mut pos = 0;
    let mut secret = Vec::new();
    let mut name = String::new();
    let mut issuer = String::new();
    let mut algorithm = MigrationAlgorithm::Unspecified;
    let mut digits = 0;
    let mut otp_type = MigrationOtpType::Unspecified;

    while pos < data.len() {
        let key = read_varint(data, &mut pos)?;
        let field_number = key >> 3;
        let wire_type = (key & 0x07) as u8;

        match (field_number, wire_type) {
            (1, 2) => secret = read_len_delimited(data, &mut pos)?.to_vec(),
            (2, 2) => name = read_string(data, &mut pos)?,
            (3, 2) => issuer = read_string(data, &mut pos)?,
            (4, 0) => {
                algorithm = migration_algorithm_from_value(read_varint(data, &mut pos)? as i64)
            }
            (5, 0) => digits = migration_digits_from_value(read_varint(data, &mut pos)? as i64),
            (6, 0) => otp_type = migration_otp_type_from_value(read_varint(data, &mut pos)? as i64),
            _ => skip_field(wire_type, data, &mut pos)?,
        }
    }

    Ok(MigrationOtp {
        secret: encode_base32_no_padding(&secret),
        name,
        issuer,
        algorithm,
        digits,
        otp_type,
    })
}

fn read_string(data: &[u8], pos: &mut usize) -> std::result::Result<String, String> {
    let value = read_len_delimited(data, pos)?;
    String::from_utf8(value.to_vec())
        .map_err(|e| format!("Invalid UTF-8 in migration payload: {}", e))
}

fn read_varint(data: &[u8], pos: &mut usize) -> std::result::Result<u64, String> {
    let mut result = 0u64;
    let mut shift = 0;

    loop {
        if *pos >= data.len() {
            return Err("Unexpected end of migration payload".into());
        }
        if shift >= 64 {
            return Err("Invalid varint in migration payload".into());
        }

        let byte = data[*pos];
        *pos += 1;
        result |= ((byte & 0x7f) as u64) << shift;

        if byte & 0x80 == 0 {
            return Ok(result);
        }

        shift += 7;
    }
}

fn read_len_delimited<'a>(
    data: &'a [u8],
    pos: &mut usize,
) -> std::result::Result<&'a [u8], String> {
    let len = read_varint(data, pos)? as usize;
    if data.len().saturating_sub(*pos) < len {
        return Err("Length-delimited field exceeds migration payload size".into());
    }

    let value = &data[*pos..*pos + len];
    *pos += len;
    Ok(value)
}

fn skip_field(wire_type: u8, data: &[u8], pos: &mut usize) -> std::result::Result<(), String> {
    match wire_type {
        0 => {
            let _ = read_varint(data, pos)?;
            Ok(())
        }
        1 => skip_bytes(data, pos, 8),
        2 => {
            let len = read_varint(data, pos)? as usize;
            skip_bytes(data, pos, len)
        }
        5 => skip_bytes(data, pos, 4),
        _ => Err(format!("Unsupported protobuf wire type: {}", wire_type)),
    }
}

fn skip_bytes(data: &[u8], pos: &mut usize, len: usize) -> std::result::Result<(), String> {
    if data.len().saturating_sub(*pos) < len {
        return Err("Skipped field exceeds migration payload size".into());
    }
    *pos += len;
    Ok(())
}

fn migration_algorithm_from_value(value: i64) -> MigrationAlgorithm {
    match value {
        0 => MigrationAlgorithm::Unspecified,
        1 => MigrationAlgorithm::Sha1,
        2 => MigrationAlgorithm::Sha256,
        3 => MigrationAlgorithm::Sha512,
        4 => MigrationAlgorithm::Md5,
        other => MigrationAlgorithm::Unknown(other),
    }
}

fn migration_digits_from_value(value: i64) -> u32 {
    match value {
        1 => 6,
        2 => 8,
        _ => 0,
    }
}

fn migration_otp_type_from_value(value: i64) -> MigrationOtpType {
    match value {
        0 => MigrationOtpType::Unspecified,
        1 => MigrationOtpType::Hotp,
        2 => MigrationOtpType::Totp,
        other => MigrationOtpType::Unknown(other),
    }
}

fn encode_base32_no_padding(data: &[u8]) -> String {
    const ALPHABET: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    let mut output = String::new();
    let mut buffer = 0u32;
    let mut bits_left = 0u8;

    for byte in data {
        buffer = (buffer << 8) | (*byte as u32);
        bits_left += 8;

        while bits_left >= 5 {
            let index = ((buffer >> (bits_left - 5)) & 0x1f) as usize;
            output.push(ALPHABET[index] as char);
            bits_left -= 5;
        }

        if bits_left > 0 {
            buffer &= (1u32 << bits_left) - 1;
        } else {
            buffer = 0;
        }
    }

    if bits_left > 0 {
        let index = ((buffer << (5 - bits_left)) & 0x1f) as usize;
        output.push(ALPHABET[index] as char);
    }

    output
}

fn migration_algorithm_label(algorithm: MigrationAlgorithm) -> String {
    match algorithm {
        MigrationAlgorithm::Unspecified => "unspecified".into(),
        MigrationAlgorithm::Sha1 => "SHA1".into(),
        MigrationAlgorithm::Sha256 => "SHA256".into(),
        MigrationAlgorithm::Sha512 => "SHA512".into(),
        MigrationAlgorithm::Md5 => "MD5".into(),
        MigrationAlgorithm::Unknown(value) => format!("unknown({})", value),
    }
}

fn migration_otp_type_label(otp_type: MigrationOtpType) -> String {
    match otp_type {
        MigrationOtpType::Unspecified => "unspecified".into(),
        MigrationOtpType::Hotp => "HOTP".into(),
        MigrationOtpType::Totp => "TOTP".into(),
        MigrationOtpType::Unknown(value) => format!("unknown({})", value),
    }
}

fn migration_label(otp: &MigrationOtp) -> String {
    match (otp.issuer.trim(), otp.name.trim()) {
        ("", "") => "Unnamed account".into(),
        ("", name) => name.into(),
        (issuer, "") => issuer.into(),
        (issuer, name) => format!("{} ({})", issuer, name),
    }
}

fn unsupported_reason(otp: &MigrationOtp) -> Option<String> {
    if otp.secret.is_empty() {
        return Some("Missing secret".into());
    }
    if otp.otp_type != MigrationOtpType::Totp {
        return Some(format!(
            "{} accounts are not supported",
            migration_otp_type_label(otp.otp_type)
        ));
    }
    if otp.algorithm != MigrationAlgorithm::Sha1 {
        return Some(format!(
            "{} is not supported yet",
            migration_algorithm_label(otp.algorithm)
        ));
    }
    if otp.digits != 6 {
        return Some(format!("{}-digit codes are not supported yet", otp.digits));
    }
    None
}

fn normalize_match_text(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .chars()
        .filter(|ch| !ch.is_whitespace())
        .collect()
}

fn entry_identity_value(entry: &Entry) -> Option<String> {
    entry
        .fields
        .iter()
        .find(|field| {
            matches!(
                field.field_type,
                FieldType::Username | FieldType::Email | FieldType::Text
            )
        })
        .map(|field| normalize_match_text(&field.value))
}

fn score_entry_match(entry: &Entry, otp: &MigrationOtp) -> usize {
    let title = normalize_match_text(&entry.title);
    let issuer = normalize_match_text(&otp.issuer);
    let name = normalize_match_text(&otp.name);
    let identity = entry_identity_value(entry);
    let mut score = 0;

    if !issuer.is_empty() {
        if title == issuer {
            score += 80;
        } else if title.contains(&issuer) || issuer.contains(&title) {
            score += 35;
        }
    }

    if !name.is_empty() {
        if title == name {
            score += 30;
        }
        if let Some(identity) = identity.as_deref() {
            if identity == name {
                score += 90;
            } else if identity.contains(&name) || name.contains(identity) {
                score += 25;
            }
        }
    }

    score
}

fn suggested_entry_for_otp<'a>(vault: &'a Vault, otp: &MigrationOtp) -> Option<&'a Entry> {
    vault
        .entries
        .iter()
        .filter_map(|entry| {
            let score = score_entry_match(entry, otp);
            (score > 0).then_some((score, entry))
        })
        .max_by_key(|(score, _)| *score)
        .map(|(_, entry)| entry)
}

fn preview_item(index: usize, otp: &MigrationOtp, vault: &Vault) -> GoogleAuthenticatorImportItem {
    let unsupported_reason = unsupported_reason(otp);
    let suggested_entry = if unsupported_reason.is_none() {
        suggested_entry_for_otp(vault, otp)
    } else {
        None
    };

    GoogleAuthenticatorImportItem {
        index,
        name: otp.name.clone(),
        issuer: otp.issuer.clone(),
        label: migration_label(otp),
        algorithm: migration_algorithm_label(otp.algorithm),
        digits: otp.digits,
        otp_type: migration_otp_type_label(otp.otp_type),
        supported: unsupported_reason.is_none(),
        unsupported_reason,
        suggested_entry_id: suggested_entry.map(|entry| entry.id.to_string()),
        suggested_entry_title: suggested_entry.map(|entry| entry.title.clone()),
        suggested_entry_has_totp: suggested_entry
            .and_then(|entry| entry.totp_secret.as_ref())
            .is_some(),
    }
}

fn is_email_like(value: &str) -> bool {
    let trimmed = value.trim();
    let Some((local, domain)) = trimmed.split_once('@') else {
        return false;
    };
    !local.is_empty() && domain.contains('.') && !domain.ends_with('.')
}

fn entry_title_for_import(decision: Option<&TotpImportDecision>, otp: &MigrationOtp) -> String {
    decision
        .and_then(|decision| decision.title.as_deref())
        .map(str::trim)
        .filter(|title| !title.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| migration_label(otp))
}

fn apply_totp_to_entry(entry: &mut Entry, secret: String) {
    entry.totp_secret = Some(secret);
    entry.updated_at = chrono::Utc::now();
}

fn create_totp_entry(otp: &MigrationOtp, title: String) -> Entry {
    let mut entry = Entry::website_login(title);
    if !otp.name.trim().is_empty() {
        let field_type = if is_email_like(&otp.name) {
            FieldType::Email
        } else {
            FieldType::Username
        };
        let field_name = if matches!(field_type, FieldType::Email) {
            "Email"
        } else {
            "Username"
        };
        entry
            .fields
            .push(Field::new(field_name, otp.name.trim(), field_type));
    }
    entry.totp_secret = Some(otp.secret.clone());
    entry
}

/// Preview accounts from a Google Authenticator migration URI.
#[tauri::command]
pub async fn preview_google_authenticator_import(
    uri: String,
    state: State<'_, AppState>,
) -> Result<Vec<GoogleAuthenticatorImportItem>> {
    let accounts = parse_google_authenticator_migration_uri(&uri).map_err(AppError::Unknown)?;

    let session = state.session.read();
    let session = session.as_ref().ok_or(AppError::VaultLocked)?;

    Ok(accounts
        .iter()
        .enumerate()
        .map(|(index, otp)| preview_item(index, otp, &session.vault))
        .collect())
}

/// Import selected accounts from a Google Authenticator migration URI.
#[tauri::command]
pub async fn import_google_authenticator(
    uri: String,
    decisions: Vec<TotpImportDecision>,
    state: State<'_, AppState>,
) -> Result<TotpImportResult> {
    let accounts = parse_google_authenticator_migration_uri(&uri).map_err(AppError::Unknown)?;
    let decisions_by_index: HashMap<usize, TotpImportDecision> = decisions
        .into_iter()
        .map(|decision| (decision.index, decision))
        .collect();

    let (mut result_vault, key, salt, imported_count, updated_count, created_count, skipped_count) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;
        let mut imported_count = 0;
        let mut updated_count = 0;
        let mut created_count = 0;
        let mut skipped_count = 0;

        for (index, otp) in accounts.iter().enumerate() {
            let decision = decisions_by_index.get(&index);
            let action = decision
                .map(|decision| decision.action.as_str())
                .unwrap_or("skip");

            if unsupported_reason(otp).is_some() || action == "skip" {
                skipped_count += 1;
                continue;
            }

            match action {
                "update" => {
                    let entry_id = decision
                        .and_then(|decision| decision.entry_id.as_deref())
                        .ok_or_else(|| {
                            AppError::Unknown("Missing entry id for TOTP import".into())
                        })?;
                    let uuid = Uuid::parse_str(entry_id)
                        .map_err(|_| AppError::EntryNotFound(entry_id.to_string()))?;
                    let entry = session
                        .vault
                        .get_entry_mut(uuid)
                        .ok_or_else(|| AppError::EntryNotFound(entry_id.to_string()))?;
                    apply_totp_to_entry(entry, otp.secret.clone());
                    imported_count += 1;
                    updated_count += 1;
                }
                "create" => {
                    let title = entry_title_for_import(decision, otp);
                    let entry = create_totp_entry(otp, title);
                    session.vault.add_entry(entry);
                    imported_count += 1;
                    created_count += 1;
                }
                other => {
                    return Err(AppError::Unknown(format!(
                        "Unsupported TOTP import action: {}",
                        other
                    )));
                }
            }
        }

        (
            session.vault.clone(),
            *session.key.as_bytes(),
            session.salt,
            imported_count,
            updated_count,
            created_count,
            skipped_count,
        )
    };

    if imported_count > 0 {
        result_vault = save_vault_changes(
            &state,
            &result_vault,
            &key,
            &salt,
            "Import Google Authenticator accounts",
        )
        .await?;

        let mut session = state.session.write();
        if let Some(s) = session.as_mut() {
            s.vault = result_vault.clone();
        }
    }

    Ok(TotpImportResult {
        vault: result_vault,
        imported_count,
        updated_count,
        created_count,
        skipped_count,
    })
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

        let entry_id = Uuid::parse_str(&id).map_err(|_| AppError::EntryNotFound(id.clone()))?;

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
    let merged = save_vault_changes(&state, &vault, &key, &salt, "Set TOTP secret").await?;

    // Update session with merged vault
    {
        let mut session = state.session.write();
        if let Some(s) = session.as_mut() {
            s.vault = merged;
        }
    }

    Ok(entry)
}

/// Remove TOTP secret from an entry
#[tauri::command]
pub async fn remove_totp_secret(id: String, state: State<'_, AppState>) -> Result<Entry> {
    let (entry, vault, key, salt) = {
        let mut session = state.session.write();
        let session = session.as_mut().ok_or(AppError::VaultLocked)?;

        let entry_id = Uuid::parse_str(&id).map_err(|_| AppError::EntryNotFound(id.clone()))?;

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

    let merged = save_vault_changes(&state, &vault, &key, &salt, "Remove TOTP secret").await?;

    // Update session with merged vault
    {
        let mut session = state.session.write();
        if let Some(s) = session.as_mut() {
            s.vault = merged;
        }
    }

    Ok(entry)
}

/// Helper: extract Git sync info if available
fn get_git_sync_info(
    state: &State<'_, AppState>,
) -> Option<(crate::git::repository::GitRepository, std::path::PathBuf)> {
    let session = state.session.read();
    session
        .as_ref()
        .and_then(|s| {
            s.git_sync.as_ref().map(|git_sync| {
                let clone_dir = get_clone_dir(&git_sync.repository.url).ok()?;
                Some((git_sync.repository.clone(), clone_dir))
            })
        })
        .flatten()
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

/// Helper: save vault changes (local or Git).
/// Returns the (possibly merged) vault so callers can update the session.
async fn save_vault_changes(
    state: &State<'_, AppState>,
    vault: &crate::models::Vault,
    key: &[u8; 32],
    salt: &[u8; 16],
    commit_message: &str,
) -> Result<crate::models::Vault> {
    if let Some((repository, clone_dir)) = get_git_sync_info(state) {
        let engine = GitSyncEngine::new(repository, clone_dir);
        let (_sha, merged) = engine
            .save_vault(vault, key, salt, Some(commit_message))
            .await?;
        Ok(merged)
    } else if let Some(path) = get_local_vault_path(state) {
        save_vault_file_with_key(&path, vault, key, salt)?;
        Ok(vault.clone())
    } else {
        Ok(vault.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::engine::general_purpose;

    fn write_varint(mut value: u64, out: &mut Vec<u8>) {
        while value >= 0x80 {
            out.push((value as u8 & 0x7f) | 0x80);
            value >>= 7;
        }
        out.push(value as u8);
    }

    fn write_key(field_number: u64, wire_type: u8, out: &mut Vec<u8>) {
        write_varint((field_number << 3) | wire_type as u64, out);
    }

    fn write_bytes_field(field_number: u64, value: &[u8], out: &mut Vec<u8>) {
        write_key(field_number, 2, out);
        write_varint(value.len() as u64, out);
        out.extend_from_slice(value);
    }

    fn write_string_field(field_number: u64, value: &str, out: &mut Vec<u8>) {
        write_bytes_field(field_number, value.as_bytes(), out);
    }

    fn write_varint_field(field_number: u64, value: u64, out: &mut Vec<u8>) {
        write_key(field_number, 0, out);
        write_varint(value, out);
    }

    fn build_migration_uri(
        secret: &[u8],
        name: &str,
        issuer: &str,
        algorithm: u64,
        digits: u64,
        otp_type: u64,
    ) -> String {
        let mut otp = Vec::new();
        write_bytes_field(1, secret, &mut otp);
        write_string_field(2, name, &mut otp);
        write_string_field(3, issuer, &mut otp);
        write_varint_field(4, algorithm, &mut otp);
        write_varint_field(5, digits, &mut otp);
        write_varint_field(6, otp_type, &mut otp);

        let mut payload = Vec::new();
        write_bytes_field(1, &otp, &mut payload);

        let encoded = general_purpose::URL_SAFE_NO_PAD.encode(payload);
        format!("otpauth-migration://offline?data={}", encoded)
    }

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
    fn test_parse_google_authenticator_migration_uri_valid() {
        let uri = build_migration_uri(
            b"12345678901234567890",
            "alice@example.com",
            "GitHub",
            1,
            1,
            2,
        );

        let result = parse_google_authenticator_migration_uri(&uri);

        assert!(result.is_ok());
        let accounts = result.unwrap();
        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0].name, "alice@example.com");
        assert_eq!(accounts[0].issuer, "GitHub");
        assert_eq!(accounts[0].secret, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
        assert_eq!(accounts[0].algorithm, MigrationAlgorithm::Sha1);
        assert_eq!(accounts[0].digits, 6);
        assert_eq!(accounts[0].otp_type, MigrationOtpType::Totp);
        assert_eq!(unsupported_reason(&accounts[0]), None);
    }

    #[test]
    fn test_google_authenticator_hotp_is_unsupported() {
        let uri = build_migration_uri(
            b"12345678901234567890",
            "alice@example.com",
            "GitHub",
            1,
            1,
            1,
        );

        let accounts = parse_google_authenticator_migration_uri(&uri).unwrap();
        let reason = unsupported_reason(&accounts[0]).unwrap();

        assert!(reason.contains("HOTP"));
    }

    #[test]
    fn test_remaining_seconds_range() {
        let secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ".to_string();
        let result = generate_totp(secret).unwrap();
        assert!(result.remaining_seconds > 0);
        assert!(result.remaining_seconds <= 30);
    }
}
