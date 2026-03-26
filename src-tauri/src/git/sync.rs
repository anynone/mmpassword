//! Git sync engine for vault synchronization

use std::path::PathBuf;

use sha2::{Digest, Sha256};

use crate::error::{AppError, Result};
use crate::models::Vault;
use crate::storage::{create_vault_file_with_key, open_vault_file_with_key};
use super::operations::GitOperations;
use super::repository::{GitRepository, GitSyncState, SyncStatus};

/// Result of a sync operation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitSyncResult {
    /// Whether sync was successful
    pub success: bool,
    /// Number of entries pulled from remote
    pub entries_pulled: usize,
    /// Number of entries pushed to remote
    pub entries_pushed: usize,
    /// Number of conflicts detected
    pub conflicts: usize,
    /// New commit SHA after sync
    pub new_commit_sha: Option<String>,
    /// Error message if sync failed
    pub error: Option<String>,
}

impl GitSyncResult {
    /// Create a successful sync result
    pub fn success(
        entries_pulled: usize,
        entries_pushed: usize,
        conflicts: usize,
        new_commit_sha: Option<String>,
    ) -> Self {
        Self {
            success: true,
            entries_pulled,
            entries_pushed,
            conflicts,
            new_commit_sha,
            error: None,
        }
    }

    /// Create an error sync result
    pub fn error(message: String) -> Self {
        Self {
            success: false,
            entries_pulled: 0,
            entries_pushed: 0,
            conflicts: 0,
            new_commit_sha: None,
            error: Some(message),
        }
    }
}

/// Git sync engine for vault synchronization
pub struct GitSyncEngine {
    /// Git operations handler
    git_ops: GitOperations,
    /// Repository configuration
    repository: GitRepository,
    /// Local clone directory
    clone_dir: PathBuf,
}

impl GitSyncEngine {
    /// Create a new Git sync engine
    pub fn new(repository: GitRepository, clone_dir: PathBuf) -> Self {
        let ssh_key_path = repository.ssh_config.expand_key_path();
        let git_ops = GitOperations::new(ssh_key_path);
        Self {
            git_ops,
            repository,
            clone_dir,
        }
    }

    /// Get the vault file path in the clone
    pub fn vault_path(&self) -> PathBuf {
        self.clone_dir.join(&self.repository.vault_path)
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

    /// Check if the repository is cloned
    pub fn is_cloned(&self) -> bool {
        self.clone_dir.join(".git").exists()
    }

    /// Clone the repository if not already cloned
    pub async fn ensure_cloned(&self) -> Result<()> {
        if self.is_cloned() {
            return Ok(());
        }

        self.git_ops
            .clone_repository(
                &self.repository.url,
                &self.clone_dir,
                &self.repository.branch,
            )
            .await
    }

    /// Check if vault exists in the repository
    pub async fn vault_exists(&self) -> Result<bool> {
        self.ensure_cloned().await?;
        self.git_ops.file_exists(&self.clone_dir, &self.repository.vault_path).await
    }

    /// Open vault from the repository
    pub async fn open_vault(&self, password: &str) -> Result<(Vault, [u8; 32], [u8; 16])> {
        self.ensure_cloned().await?;

        let vault_path = self.vault_path();
        if !vault_path.exists() {
            return Err(AppError::VaultNotFound(
                self.repository.vault_path.clone()
            ));
        }

        open_vault_file_with_key(&vault_path, password)
    }

    /// Save vault to the repository
    pub async fn save_vault(
        &self,
        vault: &Vault,
        key: &[u8; 32],
        salt: &[u8; 16],
        commit_message: Option<&str>,
    ) -> Result<String> {
        // Ensure repository is cloned
        self.ensure_cloned().await?;

        // Write vault file
        let vault_path = self.vault_path();
        create_vault_file_with_key(&vault_path, vault, key, salt)?;

        // Commit and push
        let message = commit_message.unwrap_or("Update vault");
        let new_sha = self
            .git_ops
            .commit_and_push(
                &self.clone_dir,
                &self.repository.vault_path,
                message,
                &self.repository.branch,
            )
            .await?;

        Ok(new_sha)
    }

    /// Pull changes from remote
    pub async fn pull(&self) -> Result<String> {
        self.ensure_cloned().await?;
        self.git_ops
            .pull_changes(&self.clone_dir, &self.repository.branch)
            .await
    }

    /// Get current commit SHA
    pub async fn get_current_commit(&self) -> Result<String> {
        self.ensure_cloned().await?;
        self.git_ops.get_current_commit(&self.clone_dir).await
    }

    /// Get remote commit SHA
    pub async fn get_remote_commit(&self) -> Result<String> {
        self.git_ops
            .get_remote_commit(&self.repository.url, &self.repository.branch)
            .await
    }

    /// Determine sync status
    pub async fn get_sync_status(&self, local_hash: &str) -> Result<SyncStatus> {
        self.ensure_cloned().await?;

        let current_commit = self.get_current_commit().await?;
        let remote_commit = self.get_remote_commit().await?;

        if current_commit == remote_commit {
            // Check if local vault has changed
            let _current_local_hash = local_hash.to_string();
            // If we have the same commit, we're synced
            Ok(SyncStatus::Synced)
        } else {
            // Commits differ - check if we have local changes
            // For simplicity, assume remote ahead if commits differ
            // A more sophisticated approach would check local modifications
            Ok(SyncStatus::RemoteAhead)
        }
    }

    /// Full sync: pull, merge, then push
    pub async fn sync(
        &self,
        local_vault: &mut Vault,
        password: &str,
        sync_state: &GitSyncState,
        key: &[u8; 32],
        salt: &[u8; 16],
    ) -> Result<GitSyncResult> {
        // Calculate current local hash
        let current_local_hash = Self::calculate_vault_hash(local_vault);
        let local_changed = current_local_hash != sync_state.local_hash;

        // Pull remote changes
        let new_commit = self.pull().await?;
        let remote_changed = new_commit != sync_state.last_commit_sha;

        match (local_changed, remote_changed) {
            (false, false) => {
                // No changes
                Ok(GitSyncResult::success(0, 0, 0, Some(new_commit)))
            }
            (true, false) => {
                // Only local changed - push
                let sha = self
                    .save_vault(local_vault, key, salt, Some("Update vault"))
                    .await?;
                Ok(GitSyncResult::success(0, local_vault.entries.len(), 0, Some(sha)))
            }
            (false, true) => {
                // Only remote changed - pull and update local
                let (remote_vault, _, _) = self.open_vault(password).await?;
                let entries_pulled = remote_vault.entries.len();
                *local_vault = remote_vault;
                Ok(GitSyncResult::success(entries_pulled, 0, 0, Some(new_commit)))
            }
            (true, true) => {
                // Both changed - need to merge
                let (remote_vault, _, _) = self.open_vault(password).await?;

                // Simple merge strategy: prefer newest entries
                let mut entries_pulled = 0;
                let conflicts = 0;

                for remote_entry in &remote_vault.entries {
                    if let Some(local_entry) = local_vault.get_entry_mut(remote_entry.id) {
                        // Entry exists in both - check for conflict
                        if local_entry.updated_at != remote_entry.updated_at {
                            if remote_entry.updated_at > local_entry.updated_at {
                                *local_entry = remote_entry.clone();
                                entries_pulled += 1;
                            }
                            // If local is newer, keep it
                        }
                    } else {
                        // Entry only exists remotely - add it
                        local_vault.add_entry(remote_entry.clone());
                        entries_pulled += 1;
                    }
                }

                // Push merged result
                local_vault.touch();
                let sha = self
                    .save_vault(local_vault, key, salt, Some("Merge vault changes"))
                    .await?;

                Ok(GitSyncResult::success(
                    entries_pulled,
                    local_vault.entries.len(),
                    conflicts,
                    Some(sha),
                ))
            }
        }
    }
}

/// Get the default clone directory for a repository
pub fn get_clone_dir(repo_url: &str) -> Result<PathBuf> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::InvalidPath("Cannot find home directory".into()))?;

    // Create a unique directory name from the URL
    let mut hasher = Sha256::new();
    hasher.update(repo_url.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    let short_hash = &hash[..8];

    Ok(home.join(".mmpassword").join("repos").join(short_hash))
}
