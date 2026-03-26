//! Git repository metadata for recent connections

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Git repository connection metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRepoMeta {
    /// Repository URL
    pub repo_url: String,
    /// Branch name
    pub branch: String,
    /// SSH key path
    pub key_path: String,
    /// Last accessed time
    pub last_accessed: DateTime<Utc>,
    /// Repository display name (extracted from URL)
    pub repo_name: String,
}

impl GitRepoMeta {
    /// Create a new Git repository metadata
    pub fn new(repo_url: String, branch: String, key_path: String) -> Self {
        let repo_name = Self::extract_repo_name(&repo_url);
        Self {
            repo_url,
            branch,
            key_path,
            last_accessed: Utc::now(),
            repo_name,
        }
    }

    /// Extract repository name from URL
    fn extract_repo_name(url: &str) -> String {
        // Handle SSH URL: git@github.com:user/repo.git
        if url.starts_with("git@") {
            if let Some(rest) = url.strip_prefix("git@") {
                let parts: Vec<&str> = rest.splitn(2, ':').collect();
                if parts.len() == 2 {
                    let path = parts[1].strip_suffix(".git").unwrap_or(parts[1]);
                    let path_parts: Vec<&str> = path.split('/').collect();
                    return path_parts.last().unwrap_or(&"Unknown").to_string();
                }
            }
        }
        // Handle HTTPS URL: https://github.com/user/repo.git
        else if url.starts_with("http") {
            let path = url.strip_suffix(".git").unwrap_or(url);
            let path_parts: Vec<&str> = path.split('/').collect();
            return path_parts.last().unwrap_or(&"Unknown").to_string();
        }
        "Unknown".to_string()
    }
}
