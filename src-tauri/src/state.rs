//! Application state management

use std::path::PathBuf;
use std::sync::Arc;

use parking_lot::RwLock;
use tokio::sync::RwLock as AsyncRwLock;
use zeroize::ZeroizeOnDrop;

use crate::models::Vault;
use crate::storage::AppConfig;
use crate::git::repository::{GitRepository, GitSyncState};

/// The decrypted encryption key
#[derive(ZeroizeOnDrop)]
pub struct EncryptionKey(Box<[u8; 32]>);

impl EncryptionKey {
    /// Create a new encryption key
    pub fn new(key: [u8; 32]) -> Self {
        Self(Box::new(key))
    }

    /// Get the key bytes
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

/// Represents the current vault session
pub struct VaultSession {
    /// The decrypted vault
    pub vault: Vault,
    /// The file path
    pub path: PathBuf,
    /// The encryption key (kept in memory)
    pub key: EncryptionKey,
    /// The salt used for key derivation
    pub salt: [u8; 16],
    /// Whether there are unsaved changes
    pub dirty: bool,
    /// Git sync state (if vault is synced)
    pub git_sync: Option<GitSyncSession>,
}

/// Git synchronization session information
#[derive(Debug, Clone)]
pub struct GitSyncSession {
    /// Repository configuration
    pub repository: GitRepository,
    /// Sync state
    pub sync_state: GitSyncState,
}

/// Application state shared across all commands
pub struct AppState {
    /// The current vault session (if any)
    pub session: RwLock<Option<VaultSession>>,
    /// Application configuration
    pub config: AsyncRwLock<AppConfig>,
}

impl AppState {
    /// Create a new application state
    pub fn new(config: AppConfig) -> Self {
        Self {
            session: RwLock::new(None),
            config: AsyncRwLock::new(config),
        }
    }

    /// Check if a vault is currently open and unlocked
    pub fn is_unlocked(&self) -> bool {
        let session = self.session.read();
        session.is_some()
    }

    /// Get the current vault (if unlocked)
    pub fn get_vault(&self) -> Option<Vault> {
        let session = self.session.read();
        session.as_ref().map(|s| s.vault.clone())
    }

    /// Get the current vault path (if any)
    pub fn get_vault_path(&self) -> Option<PathBuf> {
        let session = self.session.read();
        session.as_ref().map(|s| s.path.clone())
    }

    /// Set the vault as modified
    pub fn mark_dirty(&self) {
        let mut session = self.session.write();
        if let Some(session) = session.as_mut() {
            session.dirty = true;
        }
    }

    /// Mark the vault as clean (saved)
    pub fn mark_clean(&self) {
        let mut session = self.session.write();
        if let Some(session) = session.as_mut() {
            session.dirty = false;
        }
    }

    /// Clear the current session (lock)
    pub fn clear_session(&self) {
        let mut session = self.session.write();
        *session = None;
    }

    /// Set a new session (unlock)
    pub fn set_session(&self, vault: Vault, path: PathBuf, key: [u8; 32], salt: [u8; 16]) {
        let mut session = self.session.write();
        *session = Some(VaultSession {
            vault,
            path,
            key: EncryptionKey::new(key),
            salt,
            dirty: false,
            git_sync: None,
        });
    }

    /// Set a new session with Git sync info
    pub fn set_session_with_git(
        &self,
        vault: Vault,
        path: PathBuf,
        key: [u8; 32],
        salt: [u8; 16],
        repository: GitRepository,
        sync_state: GitSyncState,
    ) {
        let mut session = self.session.write();
        *session = Some(VaultSession {
            vault,
            path,
            key: EncryptionKey::new(key),
            salt,
            dirty: false,
            git_sync: Some(GitSyncSession {
                repository,
                sync_state,
            }),
        });
    }
}

/// Global application state
pub type SharedState = Arc<AppState>;
