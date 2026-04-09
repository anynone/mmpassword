//! Application configuration management

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::{AppError, Result};
use crate::models::{GitRepoMeta, SubscriptionMeta, VaultMeta};

/// Last opened Git vault reference. Contains enough information to
/// reopen the vault on next startup (still requires the master password).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LastGitVault {
    pub repo_url: String,
    pub branch: String,
    pub vault_path: String,
    pub key_path: String,
    /// Display name extracted from vault_path or repo_url.
    pub repo_name: String,
}

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// Theme setting
    pub theme: Theme,
    /// Language setting
    pub language: String,
    /// Auto-lock timeout in minutes (0 = disabled)
    pub auto_lock_minutes: u32,
    /// Clear clipboard after seconds (0 = disabled)
    pub clipboard_clear_seconds: u32,
    /// Open last vault on startup
    pub open_last_vault: bool,
    /// Recent vaults list
    pub recent_vaults: Vec<VaultMeta>,
    /// Last opened local vault path
    pub last_vault_path: Option<String>,
    /// Last opened Git vault reference
    #[serde(default)]
    pub last_git_vault: Option<LastGitVault>,
    /// Recent Git repositories
    pub recent_git_repos: Vec<GitRepoMeta>,
    /// Subscription URL history
    #[serde(default)]
    pub subscription_history: Vec<SubscriptionMeta>,
    /// Window state
    pub window_state: WindowState,
}

/// Theme settings
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    Light,
    Dark,
    System,
}

/// Window state for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            width: 1200,
            height: 800,
            x: None,
            y: None,
            maximized: false,
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: Theme::default(),
            language: "en".to_string(),
            auto_lock_minutes: 15,
            clipboard_clear_seconds: 30,
            open_last_vault: true,
            recent_vaults: Vec::new(),
            last_vault_path: None,
            last_git_vault: None,
            recent_git_repos: Vec::new(),
            subscription_history: Vec::new(),
            window_state: WindowState::default(),
        }
    }
}

impl AppConfig {
    /// Load configuration from file
    pub fn load() -> Result<Self> {
        let path = get_config_path()?;

        if !path.exists() {
            return Ok(Self::default());
        }

        let content = std::fs::read_to_string(&path)?;
        let config: Self = serde_json::from_str(&content)
            .unwrap_or_else(|_| Self::default());

        Ok(config)
    }

    /// Save configuration to file
    pub fn save(&self) -> Result<()> {
        let path = get_config_path()?;

        // Create parent directory if it doesn't exist
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(&path, content)?;

        Ok(())
    }

    /// Add a vault to recent list
    pub fn add_recent_vault(&mut self, meta: VaultMeta) {
        // Remove if already exists
        self.recent_vaults.retain(|v| v.path != meta.path);

        // Add to front
        self.recent_vaults.insert(0, meta);

        // Keep only last 10
        self.recent_vaults.truncate(10);
    }

    /// Remove a vault from recent list
    pub fn remove_recent_vault(&mut self, path: &str) {
        self.recent_vaults.retain(|v| v.path != path);
    }

    /// Update last vault path (local). Clears any stored Git vault reference
    /// so `last_vault_path` and `last_git_vault` remain mutually exclusive.
    pub fn set_last_vault(&mut self, path: impl Into<String>) {
        self.last_vault_path = Some(path.into());
        self.last_git_vault = None;
    }

    /// Clear last vault path
    pub fn clear_last_vault(&mut self) {
        self.last_vault_path = None;
    }

    /// Update last opened Git vault. Clears any stored local vault path
    /// so `last_vault_path` and `last_git_vault` remain mutually exclusive.
    pub fn set_last_git_vault(&mut self, vault: LastGitVault) {
        self.last_git_vault = Some(vault);
        self.last_vault_path = None;
    }

    /// Clear last Git vault reference
    pub fn clear_last_git_vault(&mut self) {
        self.last_git_vault = None;
    }

    /// Add a Git repository to recent list
    pub fn add_recent_git_repo(&mut self, meta: GitRepoMeta) {
        // Remove if already exists (by URL and branch)
        self.recent_git_repos
            .retain(|r| !(r.repo_url == meta.repo_url && r.branch == meta.branch));

        // Add to front
        self.recent_git_repos.insert(0, meta);

        // Keep only last 10
        self.recent_git_repos.truncate(10);
    }

    /// Remove a Git repository from recent list
    pub fn remove_recent_git_repo(&mut self, repo_url: &str, branch: &str) {
        self.recent_git_repos
            .retain(|r| !(r.repo_url == repo_url && r.branch == branch));
    }

    /// Add or update a subscription URL in history
    pub fn add_subscription_history(&mut self, meta: SubscriptionMeta) {
        // Remove if already exists (by URL)
        self.subscription_history.retain(|s| s.url != meta.url);

        // Add to front
        self.subscription_history.insert(0, meta);

        // Keep only last 10
        self.subscription_history.truncate(10);
    }

    /// Remove a subscription URL from history
    pub fn remove_subscription_history(&mut self, url: &str) {
        self.subscription_history.retain(|s| s.url != url);
    }
}

/// Get the configuration file path
fn get_config_path() -> Result<PathBuf> {
    let config_dir = get_config_dir()?;
    Ok(config_dir.join("config.json"))
}

/// Get the configuration directory
pub fn get_config_dir() -> Result<PathBuf> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::InvalidPath("Cannot find home directory".into()))?;
    Ok(home.join(".mmpassword"))
}

/// Ensure the configuration directory exists
pub fn ensure_config_dir() -> Result<PathBuf> {
    let dir = get_config_dir()?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.language, "en");
        assert_eq!(config.auto_lock_minutes, 15);
        assert!(config.open_last_vault);
    }

    #[test]
    fn test_add_recent_vault() {
        let mut config = AppConfig::default();

        let meta = VaultMeta::new("/path/to/vault.mmp", "Test Vault");
        config.add_recent_vault(meta);

        assert_eq!(config.recent_vaults.len(), 1);
    }

    #[test]
    fn test_recent_vault_limit() {
        let mut config = AppConfig::default();

        for i in 0..15 {
            let meta = VaultMeta::new(format!("/path/vault{}.mmp", i), format!("Vault {}", i));
            config.add_recent_vault(meta);
        }

        assert_eq!(config.recent_vaults.len(), 10);
    }
}
