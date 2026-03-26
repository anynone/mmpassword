//! SSH key configuration for Git operations

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// SSH key configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshKeyConfig {
    /// Private key file path (e.g., ~/.ssh/id_ed25519)
    pub key_path: PathBuf,
    /// Optional: passphrase stored in system keyring
    pub passphrase_keyring_id: Option<String>,
}

impl SshKeyConfig {
    /// Create a new SSH key config with the given key path
    pub fn new(key_path: PathBuf) -> Self {
        Self {
            key_path,
            passphrase_keyring_id: None,
        }
    }

    /// Create a new SSH key config with passphrase support
    pub fn with_passphrase(key_path: PathBuf, passphrase_keyring_id: String) -> Self {
        Self {
            key_path,
            passphrase_keyring_id: Some(passphrase_keyring_id),
        }
    }

    /// Get the key path as a string
    pub fn key_path_str(&self) -> String {
        self.key_path.to_string_lossy().to_string()
    }

    /// Expand ~ in the key path to the home directory
    pub fn expand_key_path(&self) -> PathBuf {
        if self.key_path.starts_with("~") {
            if let Some(home) = dirs::home_dir() {
                let stripped = self.key_path.strip_prefix("~").unwrap_or(&self.key_path);
                return home.join(stripped.strip_prefix("/").unwrap_or(stripped));
            }
        }
        self.key_path.clone()
    }
}

/// Validation result for SSH key
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshKeyValidation {
    /// Whether the key is valid
    pub valid: bool,
    /// Key type (e.g., "ED25519", "RSA")
    pub key_type: Option<String>,
    /// Key fingerprint
    pub fingerprint: Option<String>,
    /// Error message if invalid
    pub error: Option<String>,
}

/// Detected SSH key information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedSshKey {
    /// Key file path
    pub path: String,
    /// Key type (inferred from filename)
    pub key_type: String,
    /// Whether the key has a corresponding public key
    pub has_public_key: bool,
}
