//! Git operations using system git command
//!
//! This module provides Git operations by executing the system git command.
//! SSH authentication is handled automatically by git through SSH agent or ~/.ssh/config.

use std::path::{Path, PathBuf};

use crate::error::{AppError, Result};
use super::ssh_config::{DetectedSshKey, SshKeyValidation};
use super::repository::GitAccessValidation;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

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
        // Convert Windows backslashes to forward slashes for SSH compatibility
        let key_str = key_path.to_string_lossy().replace('\\', "/");
        Some(format!(
            "ssh -o IdentitiesOnly=yes -o IdentityFile={} -o StrictHostKeyChecking=accept-new",
            key_str
        ))
    }

    /// Create a command without showing a window on Windows
    fn create_command(program: &str) -> std::process::Command {
        #[cfg(windows)]
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let mut cmd = std::process::Command::new(program);

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd
    }

    /// Run a command asynchronously without blocking
    async fn run_command_async(program: &str, args: &[&str]) -> Result<std::process::Output> {
        let program = program.to_string();
        let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
        let output = tokio::task::spawn_blocking(move || {
            let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
            Self::create_command(&program).args(&args_ref).output()
        })
            .await
            .map_err(|e| AppError::GitError(format!("Command join error: {}", e)))?
            .map_err(|e| AppError::GitError(format!("Command execution error: {}", e)))?;
        Ok(output)
    }

    /// Create a git command with SSH environment configured
    fn git_command(&self) -> std::process::Command {
        let mut cmd = Self::create_command("git");
        if let Some(ref ssh_cmd) = self.ssh_command {
            cmd.env("GIT_SSH_COMMAND", ssh_cmd);
        }
        cmd
    }

    /// Run git command asynchronously
    async fn run_git_command(&self, args: &[&str]) -> Result<std::process::Output> {
        let mut cmd = self.git_command();
        let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();

        let output = tokio::task::spawn_blocking(move || {
            cmd.args(&args).output()
        })
            .await
            .map_err(|e| AppError::GitError(format!("Command join error: {}", e)))?
            .map_err(|e| AppError::GitError(format!("Command execution error: {}", e)))?;

        Ok(output)
    }

    /// Run git command asynchronously in a specific directory
    async fn run_git_command_in_dir(&self, args: &[&str], dir: &Path) -> Result<std::process::Output> {
        let mut cmd = self.git_command();
        let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
        let dir = dir.to_path_buf();

        let output = tokio::task::spawn_blocking(move || {
            cmd.current_dir(&dir).args(&args).output()
        })
            .await
            .map_err(|e| AppError::GitError(format!("Command join error: {}", e)))?
            .map_err(|e| AppError::GitError(format!("Command execution error: {}", e)))?;

        Ok(output)
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
        let output = Self::run_command_async("ssh-keygen", &["-l", "-f", &key_path.to_string_lossy()])
            .await?;

        if output.status.success() {
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
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Ok(SshKeyValidation {
                valid: false,
                key_type: None,
                fingerprint: None,
                error: if stderr.is_empty() { Some("Unknown error".to_string()) } else { Some(stderr.to_string()) },
            })
        }
    }

    /// Validate Git repository access
    pub async fn validate_git_access(&self, repo_url: &str) -> Result<GitAccessValidation> {
        // Use git ls-remote to test access
        let output = self
            .run_git_command(&["ls-remote", "--symref", repo_url, "HEAD"])
            .await?;

        if output.status.success() {
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
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Ok(GitAccessValidation {
                valid: false,
                repo_name: None,
                default_branch: None,
                error: if stderr.is_empty() { Some("Unknown error".to_string()) } else { Some(stderr.to_string()) },
            })
        }
    }

    /// Check if a remote branch exists
    pub async fn remote_branch_exists(&self, repo_url: &str, branch: &str) -> Result<bool> {
        let output = self
            .run_git_command(&["ls-remote", "--heads", repo_url, &format!("refs/heads/{}", branch)])
            .await?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            Ok(!stdout.trim().is_empty())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(AppError::GitError(format!("Failed to check remote branch: {}", stderr)))
        }
    }

    /// Check if the remote repository has any branches
    pub async fn has_remote_branches(&self, repo_url: &str) -> Result<bool> {
        let output = self
            .run_git_command(&["ls-remote", "--heads", repo_url])
            .await?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            Ok(!stdout.trim().is_empty())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(AppError::GitError(format!("Failed to check remote branches: {}", stderr)))
        }
    }

    /// Clone a repository, creating the branch if it doesn't exist
    /// For empty repositories, initialize with a placeholder commit
    pub async fn clone_repository(&self, repo_url: &str, target_dir: &Path, branch: &str) -> Result<()> {
        // Ensure parent directory exists
        if let Some(parent) = target_dir.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Io(e))?;
        }

        // Check if target branch exists remotely
        let branch_exists = self.remote_branch_exists(repo_url, branch).await?;

        if branch_exists {
            // Branch exists, clone it directly
            let target_dir_str = target_dir.to_string_lossy().to_string();
            let output = self
                .run_git_command(&[
                    "clone",
                    "--branch", branch,
                    "--single-branch",
                    "--depth", "1",
                    repo_url,
                    &target_dir_str,
                ])
                .await?;

            if output.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(AppError::GitError(stderr.to_string()))
            }
        } else {
            // Target branch doesn't exist, check if repo has any branches
            let has_branches = self.has_remote_branches(repo_url).await?;

            if has_branches {
                // Repo has branches but not the target one
                // Clone the default branch and create the new branch
                let target_dir_str = target_dir.to_string_lossy().to_string();
                let output = self
                    .run_git_command(&["clone", repo_url, &target_dir_str])
                    .await?;

                if output.status.success() {
                    // Create and switch to the new branch
                    self.create_and_push_branch(target_dir, branch).await
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    Err(AppError::GitError(stderr.to_string()))
                }
            } else {
                // Empty repository - initialize locally and push
                self.init_empty_repo(target_dir, repo_url, branch).await
            }
        }
    }

    /// Create a new branch and push it to remote
    async fn create_and_push_branch(&self, repo_dir: &Path, branch: &str) -> Result<()> {
        // Create and switch to the new branch
        let checkout_output = self
            .run_git_command_in_dir(&["checkout", "-b", branch], repo_dir)
            .await?;

        if checkout_output.status.success() {
            // Push the new branch to remote and set upstream
            let push_output = self
                .run_git_command_in_dir(&["push", "-u", "origin", branch], repo_dir)
                .await?;

            if push_output.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&push_output.stderr);
                Err(AppError::GitError(format!("Failed to push new branch: {}", stderr)))
            }
        } else {
            let stderr = String::from_utf8_lossy(&checkout_output.stderr);
            Err(AppError::GitError(format!("Failed to create branch: {}", stderr)))
        }
    }

    /// Initialize an empty repository and push to remote
    async fn init_empty_repo(&self, target_dir: &Path, repo_url: &str, branch: &str) -> Result<()> {
        // Create the directory
        tokio::fs::create_dir_all(target_dir)
            .await
            .map_err(|e| AppError::Io(e))?;

        // Initialize git repo
        let init_output = self
            .run_git_command_in_dir(&["init"], target_dir)
            .await?;

        if !init_output.status.success() {
            let stderr = String::from_utf8_lossy(&init_output.stderr);
            return Err(AppError::GitError(format!("Failed to init repo: {}", stderr)));
        }

        // Set initial branch name (git 2.28+)
        let _ = self
            .run_git_command_in_dir(&["branch", "-M", branch], target_dir)
            .await;

        // Add remote
        let remote_output = self
            .run_git_command_in_dir(&["remote", "add", "origin", repo_url], target_dir)
            .await?;

        if !remote_output.status.success() {
            let stderr = String::from_utf8_lossy(&remote_output.stderr);
            return Err(AppError::GitError(format!("Failed to add remote: {}", stderr)));
        }

        // Create a placeholder file for initial commit
        let readme_path = target_dir.join("README.md");
        tokio::fs::write(&readme_path, "# mmpassword Vault\n\nThis repository stores encrypted password vault data.\n")
            .await
            .map_err(|e| AppError::Io(e))?;

        // Add and commit
        let add_output = self
            .run_git_command_in_dir(&["add", "README.md"], target_dir)
            .await?;

        if !add_output.status.success() {
            let stderr = String::from_utf8_lossy(&add_output.stderr);
            return Err(AppError::GitError(format!("Failed to git add: {}", stderr)));
        }

        let commit_output = self
            .run_git_command_in_dir(&["commit", "-m", "Initial commit"], target_dir)
            .await?;

        if !commit_output.status.success() {
            let stderr = String::from_utf8_lossy(&commit_output.stderr);
            return Err(AppError::GitError(format!("Failed to commit: {}", stderr)));
        }

        // Push to remote
        let push_output = self
            .run_git_command_in_dir(&["push", "-u", "origin", branch], target_dir)
            .await?;

        if push_output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&push_output.stderr);
            Err(AppError::GitError(format!("Failed to push to remote: {}", stderr)))
        }
    }

    /// Pull changes from remote
    pub async fn pull_changes(&self, repo_dir: &Path, branch: &str) -> Result<String> {
        let output = self
            .run_git_command_in_dir(&["pull", "--rebase", "origin", branch], repo_dir)
            .await?;

        if output.status.success() {
            // Get the latest commit SHA
            self.get_current_commit(repo_dir).await
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Check if it's just "Already up to date"
            if stderr.contains("Already up to date") || stderr.contains("Already up-to-date") {
                self.get_current_commit(repo_dir).await
            } else {
                Err(AppError::GitError(stderr.to_string()))
            }
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
            .run_git_command_in_dir(&["add", file_path], repo_dir)
            .await?;

        if !add_output.status.success() {
            let stderr = String::from_utf8_lossy(&add_output.stderr);
            return Err(AppError::GitError(format!("git add failed: {}", stderr)));
        }

        // Commit
        let commit_output = self
            .run_git_command_in_dir(&["commit", "-m", commit_message], repo_dir)
            .await?;

        if commit_output.status.success() {
            // Push
            let push_output = self
                .run_git_command_in_dir(&["push", "origin", branch], repo_dir)
                .await?;

            if push_output.status.success() {
                self.get_current_commit(repo_dir).await
            } else {
                let stderr = String::from_utf8_lossy(&push_output.stderr);
                Err(AppError::GitError(format!("git push failed: {}", stderr)))
            }
        } else {
            let stdout = String::from_utf8_lossy(&commit_output.stdout);
            let stderr = String::from_utf8_lossy(&commit_output.stderr);
            // Check if there's nothing to commit
            if stdout.contains("nothing to commit") || stderr.contains("nothing to commit") {
                self.get_current_commit(repo_dir).await
            } else {
                Err(AppError::GitError(format!("git commit failed: {}", stderr)))
            }
        }
    }

    /// Get the current commit SHA
    pub async fn get_current_commit(&self, repo_dir: &Path) -> Result<String> {
        let output = self
            .run_git_command_in_dir(&["rev-parse", "HEAD"], repo_dir)
            .await?;

        if output.status.success() {
            let sha = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(sha)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(AppError::GitError(format!("Failed to get commit SHA: {}", stderr)))
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
            .run_git_command(&["ls-remote", repo_url, &format!("refs/heads/{}", branch)])
            .await?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let sha = stdout.split_whitespace().next().map(|s| s.to_string());
            sha.ok_or_else(|| AppError::GitError("Could not parse remote commit SHA".to_string()))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(AppError::GitError(format!("Failed to get remote commit: {}", stderr)))
        }
    }

    /// List all vault files (.mmp) in the repository
    pub async fn list_vault_files(&self, repo_dir: &Path) -> Result<Vec<String>> {
        let mut vault_files = Vec::new();
        self.list_vault_files_recursive(repo_dir, "", &mut vault_files).await?;
        vault_files.sort();
        Ok(vault_files)
    }

    /// Recursively scan directory for .mmp files
    async fn list_vault_files_recursive(
        &self,
        current_dir: &Path,
        relative_path: &str,
        vault_files: &mut Vec<String>,
    ) -> Result<()> {
        let mut entries = tokio::fs::read_dir(current_dir)
            .await
            .map_err(|e| AppError::Io(e))?;

        while let Some(entry) = entries.next_entry().await.map_err(|e| AppError::Io(e))? {
            let file_name = entry.file_name().to_string_lossy().to_string();
            let entry_path = entry.path();

            // Skip hidden directories and .git directory
            if file_name.starts_with('.') {
                continue;
            }

            let relative_file_path = if relative_path.is_empty() {
                file_name.clone()
            } else {
                format!("{}/{}", relative_path, file_name)
            };

            if entry_path.is_dir() {
                // Recurse into subdirectories
                Box::pin(self.list_vault_files_recursive(
                    &entry_path,
                    &relative_file_path,
                    vault_files,
                ))
                .await?;
            } else if file_name.ends_with(".mmp") {
                // Found a vault file
                vault_files.push(relative_file_path);
            }
        }

        Ok(())
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
    // Handle SSH shorthand: git@host:owner/repo.git
    if url.starts_with("git@") {
        let rest = url.strip_prefix("git@")?;
        let parts: Vec<&str> = rest.splitn(2, ':').collect();
        if parts.len() == 2 {
            let path = parts[1].strip_suffix(".git").unwrap_or(parts[1]);
            let path_parts: Vec<&str> = path.split('/').collect();
            return path_parts.last().map(|s| s.to_string());
        }
    }
    // Handle SSH protocol and HTTP(S): extract last path segment
    if url.starts_with("ssh://") || url.starts_with("http://") || url.starts_with("https://") {
        let path = url.strip_suffix(".git").unwrap_or(url);
        let path_parts: Vec<&str> = path.split('/').collect();
        return path_parts.last().map(|s| s.to_string());
    }
    None
}
