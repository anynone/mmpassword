//! Sync engine for vault synchronization
//!
//! This module provides synchronization functionality between local and remote vaults.
//! Note: GitHub-specific sync has been replaced with Git SSH sync.
//! See the git::sync module for the new implementation.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::error::Result;
use crate::models::Vault;
use super::conflict::ConflictStrategy;

/// Sync state tracking (kept for backwards compatibility)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    /// SHA of the remote vault file
    pub remote_sha: String,
    /// Last sync timestamp
    pub last_sync_at: DateTime<Utc>,
    /// Hash of the vault at last sync
    pub local_hash: String,
}

impl SyncState {
    pub fn new(remote_sha: String, local_hash: String) -> Self {
        Self {
            remote_sha,
            last_sync_at: Utc::now(),
            local_hash,
        }
    }
}

/// Result of a sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    /// Whether sync was successful
    pub success: bool,
    /// Number of entries pulled from remote
    pub entries_pulled: usize,
    /// Number of entries pushed to remote
    pub entries_pushed: usize,
    /// Number of conflicts detected
    pub conflicts: usize,
    /// New remote SHA after sync
    pub new_sha: Option<String>,
    /// Error message if sync failed
    pub error: Option<String>,
}

impl SyncResult {
    pub fn success(
        entries_pulled: usize,
        entries_pushed: usize,
        conflicts: usize,
        new_sha: Option<String>,
    ) -> Self {
        Self {
            success: true,
            entries_pulled,
            entries_pushed,
            conflicts,
            new_sha,
            error: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            entries_pulled: 0,
            entries_pushed: 0,
            conflicts: 0,
            new_sha: None,
            error: Some(message),
        }
    }
}

/// Sync engine for vault synchronization
///
/// Note: This struct is deprecated. Use git::sync::GitSyncEngine instead.
#[allow(dead_code)]
pub struct SyncEngine {
    strategy: ConflictStrategy,
}

impl SyncEngine {
    /// Create a new sync engine with the default conflict strategy
    pub fn new() -> Result<Self> {
        Ok(Self {
            strategy: ConflictStrategy::default(),
        })
    }

    /// Create a new sync engine with a specific conflict strategy
    pub fn with_strategy(strategy: ConflictStrategy) -> Result<Self> {
        Ok(Self {
            strategy,
        })
    }

    /// Calculate hash of a vault for change detection
    pub fn calculate_vault_hash(vault: &Vault) -> String {
        let mut hasher = Sha256::new();

        // Hash entries
        for entry in &vault.entries {
            hasher.update(entry.id.as_bytes());
            hasher.update(entry.updated_at.to_rfc3339().as_bytes());
        }

        // Hash groups
        for group in &vault.groups {
            hasher.update(group.id.as_bytes());
            hasher.update(group.updated_at.to_rfc3339().as_bytes());
        }

        format!("{:x}", hasher.finalize())
    }
}

impl Default for SyncEngine {
    fn default() -> Self {
        Self::new().expect("Failed to create sync engine")
    }
}
