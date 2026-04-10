//! Error types for the mmpassword application

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Decryption error: {0}")]
    Decryption(String),

    #[error("Invalid master password")]
    InvalidPassword,

    #[error("Vault not found: {0}")]
    VaultNotFound(String),

    #[error("Vault is locked")]
    VaultLocked,

    #[error("Vault is already unlocked")]
    VaultAlreadyUnlocked,

    #[error("Entry not found: {0}")]
    EntryNotFound(String),

    #[error("Group not found: {0}")]
    GroupNotFound(String),

    #[error("Invalid file format")]
    InvalidFileFormat,

    #[error("File version mismatch: expected {0}, got {1}")]
    VersionMismatch(u32, u32),

    #[error("Password too short: minimum {0} characters")]
    PasswordTooShort(usize),

    #[error("Passwords do not match")]
    PasswordMismatch,

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Operation cancelled")]
    Cancelled,

    #[error("Unknown error: {0}")]
    Unknown(String),

    #[error("Sync conflict detected")]
    SyncConflict,

    #[error("Sync error: {0}")]
    SyncError(String),

    #[error("Keyring error: {0}")]
    KeyringError(String),

    // Git related errors
    #[error("Git error: {0}")]
    GitError(String),

    #[error("Git repository not found: {0}")]
    GitRepoNotFound(String),

    #[error("Git authentication failed: {0}")]
    GitAuthFailed(String),

    #[error("SSH key error: {0}")]
    SshKeyError(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<argon2::Error> for AppError {
    fn from(err: argon2::Error) -> Self {
        AppError::Encryption(err.to_string())
    }
}

impl From<chacha20poly1305::Error> for AppError {
    fn from(err: chacha20poly1305::Error) -> Self {
        AppError::Encryption(err.to_string())
    }
}

impl From<uuid::Error> for AppError {
    fn from(err: uuid::Error) -> Self {
        AppError::Unknown(err.to_string())
    }
}

impl From<keyring::Error> for AppError {
    fn from(err: keyring::Error) -> Self {
        AppError::KeyringError(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
