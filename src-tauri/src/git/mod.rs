//! Git SSH integration module for mmpassword
//!
//! This module provides Git over SSH functionality for syncing vaults
//! with remote Git repositories (GitHub, GitLab, Gitea, etc.).

pub mod operations;
pub mod repository;
pub mod ssh_config;
pub mod sync;

pub use operations::GitOperations;
pub use repository::{GitRepository, GitSyncState};
pub use ssh_config::SshKeyConfig;
pub use sync::GitSyncEngine;
