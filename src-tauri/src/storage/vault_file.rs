//! Vault file format implementation
//!
//! .mmp file structure:
//! - Header (8 bytes): Magic number "MMP1" + Version (2 bytes) + Reserved (2 bytes)
//! - Salt (16 bytes): Argon2id salt
//! - Encrypted data: Nonce (12 bytes) + Ciphertext (variable) + Tag (16 bytes)

use std::path::{Path, PathBuf};

use crate::crypto::{decrypt, encrypt, random_nonce, EncryptedData, NONCE_SIZE};
use crate::crypto::{derive_key, KdfParams};
use crate::error::{AppError, Result};
use crate::models::{Vault, VAULT_VERSION};

/// Shared password for subscription vault decryption.
/// In production, this should be injected via environment variable.
const SUBSCRIPTION_SHARED_PASSWORD: &str = match option_env!("MMP_SUBSCRIPTION_PASSWORD") {
    Some(p) => p,
    None => "mmpassword-subscription-shared-key-2024",
};

/// Get the subscription shared password
pub fn get_subscription_password() -> &'static str {
    SUBSCRIPTION_SHARED_PASSWORD
}
const MMP_MAGIC: &[u8; 4] = b"MMP1";

/// Header size in bytes
const HEADER_SIZE: usize = 8;
/// Salt size in bytes
const SALT_SIZE: usize = 16;
/// Tag size in bytes
const TAG_SIZE: usize = 16;

/// Vault file header
#[derive(Debug, Clone)]
pub struct VaultHeader {
    pub version: u16,
}

impl VaultHeader {
    /// Create a new header with the current version
    pub fn new() -> Self {
        Self {
            version: VAULT_VERSION as u16,
        }
    }

    /// Parse header from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < HEADER_SIZE {
            return Err(AppError::InvalidFileFormat);
        }

        // Check magic number
        if &bytes[0..4] != MMP_MAGIC {
            return Err(AppError::InvalidFileFormat);
        }

        let version = u16::from_le_bytes([bytes[4], bytes[5]]);

        Ok(Self { version })
    }

    /// Serialize header to bytes
    pub fn to_bytes(&self) -> [u8; HEADER_SIZE] {
        let mut bytes = [0u8; HEADER_SIZE];
        bytes[0..4].copy_from_slice(MMP_MAGIC);
        bytes[4..6].copy_from_slice(&self.version.to_le_bytes());
        // bytes[6..8] are reserved
        bytes
    }
}

impl Default for VaultHeader {
    fn default() -> Self {
        Self::new()
    }
}

/// Create a new vault file using pre-derived key
pub fn create_vault_file_with_key(
    path: &Path,
    vault: &Vault,
    key: &[u8; 32],
    salt: &[u8; 16],
) -> Result<()> {
    // Generate nonce
    let nonce = random_nonce();

    // Serialize vault to JSON
    let json = serde_json::to_vec(vault)?;

    // Encrypt
    let encrypted = encrypt(&json, key, &nonce)?;

    // Write to file: header + salt + encrypted(nonce + ciphertext + tag)
    let mut file_data = Vec::new();
    file_data.extend_from_slice(&VaultHeader::new().to_bytes());
    file_data.extend_from_slice(salt);
    file_data.extend_from_slice(&encrypted.to_bytes());

    std::fs::write(path, file_data)?;

    Ok(())
}

/// Open and decrypt a vault file, returns vault, key, and salt
pub fn open_vault_file_with_key(path: &Path, password: &str) -> Result<(Vault, [u8; 32], [u8; 16])> {
    let file_data = std::fs::read(path)?;

    if file_data.len() < HEADER_SIZE + SALT_SIZE + NONCE_SIZE + TAG_SIZE {
        return Err(AppError::InvalidFileFormat);
    }

    // Parse header
    let header = VaultHeader::from_bytes(&file_data[0..HEADER_SIZE])?;

    // Check version
    if header.version as u32 > VAULT_VERSION {
        return Err(AppError::VersionMismatch(VAULT_VERSION, header.version as u32));
    }

    // Extract salt and encrypted data
    let mut salt = [0u8; SALT_SIZE];
    salt.copy_from_slice(&file_data[HEADER_SIZE..HEADER_SIZE + SALT_SIZE]);
    let encrypted_bytes = &file_data[HEADER_SIZE + SALT_SIZE..];

    // Derive key from password
    let derived_key = derive_key(password, &salt, &KdfParams::default())?;
    let key = derived_key.into_array()?;

    // Parse EncryptedData (contains nonce + ciphertext)
    let encrypted = EncryptedData::from_bytes(encrypted_bytes)?;

    // Decrypt
    let plaintext = decrypt(&encrypted, &key)?;
    let json_str = String::from_utf8(plaintext)
        .map_err(|e| AppError::Decryption(format!("Invalid UTF-8: {}", e)))?;

    // Deserialize vault
    let vault: Vault = serde_json::from_str(&json_str)?;

    Ok((vault, key, salt))
}

/// Save changes to an existing vault file using pre-derived key
pub fn save_vault_file_with_key(
    path: &Path,
    vault: &Vault,
    key: &[u8; 32],
    salt: &[u8; 16],
) -> Result<()> {
    create_vault_file_with_key(path, vault, key, salt)
}

// Legacy functions kept for backwards compatibility

/// Create a new vault file (legacy, derives key internally)
pub fn create_vault_file(path: &Path, vault: &Vault, password: &str) -> Result<()> {
    // Generate salt and nonce
    let salt = crate::crypto::random_salt();
    let nonce = random_nonce();

    // Derive key from password
    let derived_key = derive_key(password, &salt, &KdfParams::default())?;
    let key = derived_key.into_array()?;

    // Serialize vault to JSON
    let json = serde_json::to_vec(vault)?;
    let json_str = String::from_utf8(json)
        .map_err(|_e| AppError::InvalidFileFormat)?;

    // Encrypt
    let encrypted = encrypt(json_str.as_bytes(), &key, &nonce)?;

    // Write to file: header + salt + encrypted(nonce + ciphertext + tag)
    let mut file_data = Vec::new();
    file_data.extend_from_slice(&VaultHeader::new().to_bytes());
    file_data.extend_from_slice(&salt);
    file_data.extend_from_slice(&encrypted.to_bytes());

    std::fs::write(path, file_data)?;

    Ok(())
}

/// Open and decrypt a vault file (legacy, doesn't return key)
pub fn open_vault_file(path: &Path, password: &str) -> Result<Vault> {
    let (vault, _key, _salt) = open_vault_file_with_key(path, password)?;
    Ok(vault)
}

/// Save changes to an existing vault file (legacy)
pub fn save_vault_file(path: &Path, vault: &Vault, password: &str) -> Result<()> {
    create_vault_file(path, vault, password)
}

/// Check if a file is a valid .mmp file
pub fn is_vault_file(path: &Path) -> bool {
    if !path.exists() {
        return false;
    }

    match std::fs::read(path) {
        Ok(data) if data.len() >= HEADER_SIZE => {
            &data[0..4] == MMP_MAGIC
        }
        _ => false,
    }
}

/// Decrypt a vault from raw .mmp binary data in memory (no filesystem access)
pub fn decrypt_vault_from_bytes(data: &[u8], password: &str) -> Result<Vault> {
    if data.len() < HEADER_SIZE + SALT_SIZE + NONCE_SIZE + TAG_SIZE {
        return Err(AppError::InvalidFileFormat);
    }

    // Parse header
    let header = VaultHeader::from_bytes(&data[0..HEADER_SIZE])?;

    // Check version
    if header.version as u32 > VAULT_VERSION {
        return Err(AppError::VersionMismatch(VAULT_VERSION, header.version as u32));
    }

    // Extract salt
    let mut salt = [0u8; SALT_SIZE];
    salt.copy_from_slice(&data[HEADER_SIZE..HEADER_SIZE + SALT_SIZE]);

    // Extract encrypted data
    let encrypted_bytes = &data[HEADER_SIZE + SALT_SIZE..];

    // Derive key from password
    let derived_key = derive_key(password, &salt, &KdfParams::default())?;
    let key = derived_key.into_array()?;

    // Parse EncryptedData
    let encrypted = EncryptedData::from_bytes(encrypted_bytes)?;

    // Decrypt
    let plaintext = decrypt(&encrypted, &key)?;
    let json_str = String::from_utf8(plaintext)
        .map_err(|e| AppError::Decryption(format!("Invalid UTF-8: {}", e)))?;

    // Deserialize vault
    let vault: Vault = serde_json::from_str(&json_str)?;

    Ok(vault)
}

/// Get the default vault storage directory
pub fn get_default_vault_dir() -> Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| AppError::InvalidPath("Cannot find home directory".into()))?;
    Ok(home.join(".mmpassword").join("vaults"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_create_and_open_vault() {
        let mut vault = Vault::new("Test Vault");
        let entry = crate::models::Entry::website_login("Test Entry");
        vault.add_entry(entry);

        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();
        let password = "test_password_123";

        // Create vault
        create_vault_file(path, &vault, password).unwrap();

        // Open vault
        let opened_vault = open_vault_file(path, password).unwrap();

        assert_eq!(vault.name, opened_vault.name);
        assert_eq!(vault.entries.len(), opened_vault.entries.len());
    }

    #[test]
    fn test_wrong_password_fails() {
        let vault = Vault::new("Test Vault");

        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();

        create_vault_file(path, &vault, "correct_password").unwrap();

        let result = open_vault_file(path, "wrong_password");
        assert!(result.is_err());
    }

    #[test]
    fn test_header_serialization() {
        let header = VaultHeader::new();
        let bytes = header.to_bytes();
        let restored = VaultHeader::from_bytes(&bytes).unwrap();

        assert_eq!(header.version, restored.version);
    }
}
