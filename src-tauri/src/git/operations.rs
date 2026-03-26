//! Git operations using system git command
//!
//! This module provides Git operations by executing the system git command.
//! SSH authentication is handled automatically by git through SSH agent or ~/.ssh/config.

use std::path::{Path, PathBuf};

use tokio::process::Command;

use crate::error::{AppError, Result};
use super::ssh_config::{DetectedSshKey, SshKeyValidation};
use super::repository::GitAccessValidation;

/// Git operations handler
pub struct GitOperations {
    /// Optional SSH command with key specified
    ssh_command: Option<String>,
}

impl GitOperations {
    /// Create a new GitOperations instance with the given SSH key
    pub fn new(ssh_key_path: PathBuf) -> Self {
        let ssh_command = Self::build_ssh_command(&ssh_key_path);
        Self {
            ssh_command,
        }
    }

    /// Build SSH command string with identity file
    fn build_ssh_command(key_path: &Path) -> Option<String> {
        let key_str = key_path.to_string_lossy();
        Some(format!(
            "ssh -o IdentitiesOnly=yes -o IdentityFile={} -o StrictHostKeyChecking=accept-new",
            key_str
        ))
    }

    /// Create a git command with SSH environment configured
    fn git_command(&self) -> Command {
        let mut cmd = Command::new("git");
        if let Some(ref ssh_cmd) = self.ssh_command {
            cmd.env("GIT_SSH_COMMAND", ssh_cmd);
        }
        cmd
    }

    /// Detect SSH keys in the ~/.ssh directory
    pub async fn detect_ssh_keys() -> Result<Vec<DetectedSshKey>> {
        let home = dirs::home_dir()
            .ok_or_else(|| AppError::InvalidPath("Cannot find home directory".into()))?;
        let ssh_dir = home.join(".ssh");

        if !ssh_dir.exists() {
            return Ok(Vec::new());
        }

        let mut keys = Vec::new();
        let mut read_dir = tokio::fs::read_dir(&ssh_dir)
            .await
            .map_err(|e| AppError::Io(e))?;

        // Common private key names
        let private_key_patterns = [
            "id_rsa",
            "id_dsa",
            "id_ecdsa",
            "id_ed25519",
            "id_ecdsa_sk",
            "id_ed25519_sk",
        ];

        while let Some(entry) = read_dir.next_entry().await.map_err(|e| AppError::Io(e))? {
            let file_name = entry.file_name().to_string_lossy().to_string();

            // Check if it's a private key file (no .pub extension, not a known host file)
            if !file_name.ends_with(".pub")
                && !file_name.starts_with("known_hosts")
                && !file_name.starts_with("config")
                && !file_name.starts_with(".")
            {
                // Check if it matches common key patterns or has a corresponding .pub file
                let is_known_key = private_key_patterns
                    .iter()
                    .any(|pattern| file_name == *pattern || file_name.starts_with(&format!("{}_", pattern)));

                let pub_path = entry.path().with_extension(format!("{}.pub", file_name));
                let has_public_key = pub_path.exists();

                if is_known_key || has_public_key {
                    let key_type = infer_key_type(&file_name);
                    keys.push(DetectedSshKey {
                        path: entry.path().to_string_lossy().to_string(),
                        key_type,
                        has_public_key,
                    });
                }
            }
        }

        Ok(keys)
    }

    /// Validate an SSH key
    pub async fn validate_ssh_key(key_path: &Path) -> Result<SshKeyValidation> {
        // Check if file exists
        if !key_path.exists() {
            return Ok(SshKeyValidation {
                valid: false,
                key_type: None,
                fingerprint: None,
                error: Some("Key file does not exist".to_string()),
            });
        }

        // Check file permissions (should be 600 or 400)
        let metadata = tokio::fs::metadata(key_path)
            .await
            .map_err(|e| AppError::Io(e))?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = metadata.permissions().mode();
            let perm_bits = mode & 0o777;

            // Check if group or others have any permissions
            if perm_bits & 0o077 != 0 {
                return Ok(SshKeyValidation {
                    valid: false,
                    key_type: None,
                    fingerprint: None,
                    error: Some(format!(
                        "Key file has insecure permissions ({:o}), should be 600 or 400",
                        perm_bits
                    )),
                });
            }
        }

        // Try to get key fingerprint using ssh-keygen
        let output = Command::new("ssh-keygen")
            .args(["-l", "-f"])
            .arg(key_path)
            .output()
            .await;

        match output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let parts: Vec<&str> = stdout.trim().split_whitespace().collect();

                // Format: "256 SHA256:xxx user@host (ED25519)"
                let fingerprint = parts.get(1).map(|s| s.to_string());
                let key_type = parts.get(2).and_then(|s| {
                    s.trim_start_matches('(')
                        .trim_end_matches(')')
                        .to_string()
                        .into()
                });

                Ok(SshKeyValidation {
                    valid: true,
                    key_type,
                    fingerprint,
                    error: None,
                })
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Ok(SshKeyValidation {
                    valid: false,
                    key_type: None,
                    fingerprint: None,
                    error: Some(stderr.to_string()),
                })
            }
            Err(e) => Ok(SshKeyValidation {
                valid: false,
                key_type: None,
                fingerprint: None,
                error: Some(format!("Failed to run ssh-keygen: {}", e)),
            }),
        }
    }

    /// Validate Git repository access
    pub async fn validate_git_access(&self, repo_url: &str) -> Result<GitAccessValidation> {
        // Use git ls-remote to test access
        let output = self
            .git_command()
            .args(["ls-remote", "--symref", repo_url, "HEAD"])
            .output()
            .await;

        match output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);

                // Parse default branch from output
                // Format: "ref: refs/heads/main	HEAD"
                let default_branch = stdout
                    .lines()
                    .find(|line| line.starts_with("ref: "))
                    .and_then(|line| {
                        line.strip_prefix("ref: refs/heads/")
                            .map(|s| s.split_whitespace().next().unwrap_or("main").to_string())
                    });

                // Extract repo name from URL
                let repo_name = extract_repo_name(repo_url);

                Ok(GitAccessValidation {
                    valid: true,
                    repo_name,
                    default_branch,
                    error: None,
                })
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Ok(GitAccessValidation {
                    valid: false,
                    repo_name: None,
                    default_branch: None,
                    error: Some(stderr.to_string()),
                })
            }
            Err(e) => Ok(GitAccessValidation {
                valid: false,
                repo_name: None,
                default_branch: None,
                error: Some(format!("Failed to run git: {}", e)),
            }),
        }
    }

    /// Clone a repository
    pub async fn clone_repository(&self, repo_url: &str, target_dir: &Path, branch: &str) -> Result<()> {
        // Ensure parent directory exists
        if let Some(parent) = target_dir.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Io(e))?;
        }

        let output = self
            .git_command()
            .args([
                "clone",
                "--branch", branch,
                "--single-branch",
                "--depth", "1",
                repo_url,
            ])
            .arg(target_dir)
            .output()
            .await;

        match output {
            Ok(output) if output.status.success() => Ok(()),
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(AppError::GitError(stderr.to_string()))
            }
            Err(e) => Err(AppError::GitError(format!("Failed to run git clone: {}", e))),
        }
    }

    /// Pull changes from remote
    pub async fn pull_changes(&self, repo_dir: &Path, branch: &str) -> Result<String> {
        let output = self
            .git_command()
            .args(["pull", "--rebase", "origin", branch])
            .current_dir(repo_dir)
            .output()
            .await;

        match output {
            Ok(output) if output.status.success() => {
                // Get the latest commit SHA
                self.get_current_commit(repo_dir).await
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                // Check if it's just "Already up to date"
                if stderr.contains("Already up to date") || stderr.contains("Already up-to-date") {
                    self.get_current_commit(repo_dir).await
                } else {
                    Err(AppError::GitError(stderr.to_string()))
                }
            }
            Err(e) => Err(AppError::GitError(format!("Failed to run git pull: {}", e))),
        }
    }

    /// Commit and push changes
    pub async fn commit_and_push(
        &self,
        repo_dir: &Path,
        file_path: &str,
        commit_message: &str,
        branch: &str,
    ) -> Result<String> {
        // Stage the file
        let add_output = self
            .git_command()
            .args(["add", file_path])
            .current_dir(repo_dir)
            .output()
            .await;

        match add_output {
            Ok(output) if output.status.success() => {}
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(AppError::GitError(format!("git add failed: {}", stderr)));
            }
            Err(e) => return Err(AppError::GitError(format!("Failed to run git add: {}", e))),
        }

        // Commit
        let commit_output = self
            .git_command()
            .args(["commit", "-m", commit_message])
            .current_dir(repo_dir)
            .output()
            .await;

        match commit_output {
            Ok(output) if output.status.success() => {}
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                // Check if there's nothing to commit
                if stdout.contains("nothing to commit") || stderr.contains("nothing to commit") {
                    return self.get_current_commit(repo_dir).await;
                }
                return Err(AppError::GitError(format!("git commit failed: {}", stderr)));
            }
            Err(e) => return Err(AppError::GitError(format!("Failed to run git commit: {}", e))),
        }

        // Push
        let push_output = self
            .git_command()
            .args(["push", "origin", branch])
            .current_dir(repo_dir)
            .output()
            .await;

        match push_output {
            Ok(output) if output.status.success() => self.get_current_commit(repo_dir).await,
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(AppError::GitError(format!("git push failed: {}", stderr)))
            }
            Err(e) => Err(AppError::GitError(format!("Failed to run git push: {}", e))),
        }
    }

    /// Get the current commit SHA
    pub async fn get_current_commit(&self, repo_dir: &Path) -> Result<String> {
        let output = self
            .git_command()
            .args(["rev-parse", "HEAD"])
            .current_dir(repo_dir)
            .output()
            .await;

        match output {
            Ok(output) if output.status.success() => {
                let sha = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(sha)
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(AppError::GitError(format!("Failed to get commit SHA: {}", stderr)))
            }
            Err(e) => Err(AppError::GitError(format!("Failed to run git rev-parse: {}", e))),
        }
    }

    /// Get file content at a specific path
    pub async fn get_file_content(&self, repo_dir: &Path, file_path: &str) -> Result<Vec<u8>> {
        let full_path = repo_dir.join(file_path);
        tokio::fs::read(&full_path)
            .await
            .map_err(|e| AppError::Io(e))
    }

    /// Check if a file exists in the repository
    pub async fn file_exists(&self, repo_dir: &Path, file_path: &str) -> Result<bool> {
        let full_path = repo_dir.join(file_path);
        Ok(full_path.exists())
    }

    /// Write file content to the repository
    pub async fn write_file(&self, repo_dir: &Path, file_path: &str, content: &[u8]) -> Result<()> {
        let full_path = repo_dir.join(file_path);

        // Ensure parent directory exists
        if let Some(parent) = full_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Io(e))?;
        }

        tokio::fs::write(&full_path, content)
            .await
            .map_err(|e| AppError::Io(e))
    }

    /// Get the remote commit SHA without fetching
    pub async fn get_remote_commit(&self, repo_url: &str, branch: &str) -> Result<String> {
        let output = self
            .git_command()
            .args(["ls-remote", repo_url, &format!("refs/heads/{}", branch)])
            .output()
            .await;

        match output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let sha = stdout.split_whitespace().next().map(|s| s.to_string());
                sha.ok_or_else(|| AppError::GitError("Could not parse remote commit SHA".to_string()))
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(AppError::GitError(format!("Failed to get remote commit: {}", stderr)))
            }
            Err(e) => Err(AppError::GitError(format!("Failed to run git ls-remote: {}", e))),
        }
    }
}

/// Infer key type from filename
fn infer_key_type(filename: &str) -> String {
    if filename.contains("ed25519") {
        "ED25519".to_string()
    } else if filename.contains("ecdsa") {
        "ECDSA".to_string()
    } else if filename.contains("dsa") {
        "DSA".to_string()
    } else if filename.contains("rsa") {
        "RSA".to_string()
    } else {
        "Unknown".to_string()
    }
}

/// Extract repository name from URL
fn extract_repo_name(url: &str) -> Option<String> {
    // Handle SSH URL: git@github.com:user/repo.git
    if url.starts_with("git@") {
        let rest = url.strip_prefix("git@")?;
        let parts: Vec<&str> = rest.splitn(2, ':').collect();
        if parts.len() == 2 {
            let path = parts[1].strip_suffix(".git").unwrap_or(parts[1]);
            let path_parts: Vec<&str> = path.split('/').collect();
            return path_parts.last().map(|s| s.to_string());
        }
    }
    None
}
