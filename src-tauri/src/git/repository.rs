//! Git repository configuration

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::ssh_config::SshKeyConfig;

/// Git repository configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRepository {
    /// SSH URL: git@github.com:user/repo.git
    pub url: String,
    /// Branch name (default: "main")
    pub branch: String,
    /// Vault file path in repository (e.g., "vault.mmp")
    pub vault_path: String,
    /// SSH key configuration
    pub ssh_config: SshKeyConfig,
}

impl GitRepository {
    /// Create a new Git repository config
    pub fn new(url: String, ssh_config: SshKeyConfig) -> Self {
        Self {
            url,
            branch: "main".to_string(),
            vault_path: "vault.mmp".to_string(),
            ssh_config,
        }
    }

    /// Create a Git repository config with custom settings
    pub fn with_options(
        url: String,
        branch: String,
        vault_path: String,
        ssh_config: SshKeyConfig,
    ) -> Self {
        Self {
            url,
            branch,
            vault_path,
            ssh_config,
        }
    }

    /// Parse repository info from URL
    /// Returns (host, owner, repo) if valid SSH URL
    pub fn parse_url(&self) -> Option<(String, String, String)> {
        // Parse SSH URL: git@github.com:user/repo.git
        let url = self.url.trim();

        // Check if it's an SSH URL
        if !url.starts_with("git@") {
            return None;
        }

        // Remove "git@" prefix
        let rest = url.strip_prefix("git@")?;

        // Split by ":" to get host and path
        let parts: Vec<&str> = rest.splitn(2, ':').collect();
        if parts.len() != 2 {
            return None;
        }

        let host = parts[0].to_string();
        let path = parts[1];

        // Remove .git suffix if present
        let path = path.strip_suffix(".git").unwrap_or(path);

        // Split path into owner and repo
        let path_parts: Vec<&str> = path.splitn(2, '/').collect();
        if path_parts.len() != 2 {
            return None;
        }

        Some((host, path_parts[0].to_string(), path_parts[1].to_string()))
    }

    /// Get a display name for the repository
    pub fn display_name(&self) -> String {
        if let Some((_host, owner, repo)) = self.parse_url() {
            format!("{}/{}", owner, repo)
        } else {
            self.url.clone()
        }
    }
}

/// Git synchronization state
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitSyncState {
    /// Last synced commit SHA
    pub last_commit_sha: String,
    /// Last sync timestamp
    pub last_sync_at: DateTime<Utc>,
    /// Hash of the local vault at last sync
    pub local_hash: String,
    /// Current sync status
    pub status: SyncStatus,
}

impl GitSyncState {
    /// Create a new sync state
    pub fn new(last_commit_sha: String, local_hash: String) -> Self {
        Self {
            last_commit_sha,
            last_sync_at: Utc::now(),
            local_hash,
            status: SyncStatus::Synced,
        }
    }
}

/// Sync status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncStatus {
    /// Local and remote are in sync
    Synced,
    /// Local has changes not pushed
    LocalAhead,
    /// Remote has changes not pulled
    RemoteAhead,
    /// Both local and remote have changes (potential conflict)
    Diverged,
    /// Sync in progress
    Syncing,
    /// Error during last sync
    Error,
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self::Synced
    }
}

/// Validation result for Git access
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitAccessValidation {
    /// Whether access is valid
    pub valid: bool,
    /// Repository name if accessible
    pub repo_name: Option<String>,
    /// Default branch if accessible
    pub default_branch: Option<String>,
    /// Error message if invalid
    pub error: Option<String>,
}
