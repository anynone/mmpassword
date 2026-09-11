//! Application state management

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use parking_lot::RwLock;
use tokio::sync::{Mutex as AsyncMutex, RwLock as AsyncRwLock};
use uuid::Uuid;
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

/// Represents an open vault session
pub struct VaultSession {
    /// The decrypted vault
    pub vault: Vault,
    /// The file path (pseudo `git://` path for Git vaults)
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

/// Application state shared across all commands.
///
/// Multiple vaults can be unlocked at the same time; sessions are keyed by
/// the vault's stable `Vault::id` so opening the same vault file twice
/// replaces (dedupes) the existing session.
pub struct AppState {
    /// Open vault sessions keyed by vault id
    pub sessions: RwLock<HashMap<Uuid, VaultSession>>,
    /// Application configuration
    pub config: AsyncRwLock<AppConfig>,
    /// Lock to serialize git sync operations
    pub git_sync_lock: Arc<AsyncMutex<()>>,
}

impl AppState {
    /// Create a new application state
    pub fn new(config: AppConfig) -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
            config: AsyncRwLock::new(config),
            git_sync_lock: Arc::new(AsyncMutex::new(())),
        }
    }

    /// Check if any vault session is open
    pub fn is_unlocked(&self) -> bool {
        !self.sessions.read().is_empty()
    }

    /// Get the vault of an open session
    pub fn get_vault(&self, vault_id: Uuid) -> Option<Vault> {
        self.sessions.read().get(&vault_id).map(|s| s.vault.clone())
    }

    /// Get any open vault (for legacy single-vault callers)
    pub fn get_any_vault(&self) -> Option<Vault> {
        self.sessions
            .read()
            .values()
            .next()
            .map(|s| s.vault.clone())
    }

    /// Set the vault as modified
    pub fn mark_dirty(&self, vault_id: Uuid) {
        if let Some(session) = self.sessions.write().get_mut(&vault_id) {
            session.dirty = true;
        }
    }

    /// Mark the vault as clean (saved)
    pub fn mark_clean(&self, vault_id: Uuid) {
        if let Some(session) = self.sessions.write().get_mut(&vault_id) {
            session.dirty = false;
        }
    }

    /// Remove a single session (lock that vault)
    pub fn clear_session(&self, vault_id: Uuid) {
        self.sessions.write().remove(&vault_id);
    }

    /// Remove every session (lock all vaults)
    pub fn clear_all_sessions(&self) {
        self.sessions.write().clear();
    }

    /// Insert or replace a session (unlock). The session is keyed by the
    /// vault's own id, so re-opening the same vault replaces the session.
    pub fn set_session(&self, vault: Vault, path: PathBuf, key: [u8; 32], salt: [u8; 16]) {
        let vault_id = vault.id;
        let session = VaultSession {
            vault,
            path,
            key: EncryptionKey::new(key),
            salt,
            dirty: false,
            git_sync: None,
        };
        self.sessions.write().insert(vault_id, session);
    }

    /// Insert or replace a session with Git sync info
    pub fn set_session_with_git(
        &self,
        vault: Vault,
        path: PathBuf,
        key: [u8; 32],
        salt: [u8; 16],
        repository: GitRepository,
        sync_state: GitSyncState,
    ) {
        let vault_id = vault.id;
        let session = VaultSession {
            vault,
            path,
            key: EncryptionKey::new(key),
            salt,
            dirty: false,
            git_sync: Some(GitSyncSession {
                repository,
                sync_state,
            }),
        };
        self.sessions.write().insert(vault_id, session);
    }
}
