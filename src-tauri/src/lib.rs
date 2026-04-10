//! mmpassword - A secure local password manager
//!
//! This library provides the core functionality for the mmpassword
//! password manager application built with Tauri 2.0.

pub mod commands;
pub mod crypto;
pub mod error;
pub mod git;
pub mod models;
pub mod state;
pub mod storage;
pub mod sync;

pub use error::{AppError, Result};
pub use state::AppState;

use tauri::Manager;

/// Main entry point for the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Ensure config directory exists
            storage::ensure_config_dir()
                .expect("Failed to create config directory");

            // Load config
            let config = storage::AppConfig::load()
                .expect("Failed to load config");

            // Create and manage state (Tauri will handle Arc internally)
            app.manage(AppState::new(config));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Vault commands
            commands::vault::create_vault,
            commands::vault::open_vault,
            commands::vault::unlock_vault,
            commands::vault::lock_vault,
            commands::vault::save_vault,
            commands::vault::get_current_vault,
            commands::vault::is_vault_unlocked,
            commands::vault::get_recent_vaults,
            commands::vault::remove_recent_vault,
            commands::vault::get_config,
            commands::vault::update_config,
            // Entry commands
            commands::entry::get_entries,
            commands::entry::get_entries_by_group,
            commands::entry::get_favorite_entries,
            commands::entry::get_entry,
            commands::entry::create_entry,
            commands::entry::update_entry,
            commands::entry::move_entry_to_group,
            commands::entry::delete_entry,
            commands::entry::get_trash_entries,
            commands::entry::restore_entry,
            commands::entry::delete_entry_permanently,
            commands::entry::empty_trash,
            // Group commands
            commands::group::get_groups,
            commands::group::get_group,
            commands::group::create_group,
            commands::group::update_group,
            commands::group::delete_group,
            // Git config commands
            commands::git_config::detect_ssh_keys,
            commands::git_config::validate_ssh_key,
            commands::git_config::validate_git_access,
            commands::git_config::save_git_repository_config,
            commands::git_config::get_git_repository_config,
            // Git vault commands
            commands::git_vault::list_git_vaults,
            commands::git_vault::git_vault_exists,
            commands::git_vault::create_git_vault,
            commands::git_vault::open_git_vault,
            commands::git_vault::save_git_vault,
            commands::git_vault::sync_git_vault,
            commands::git_vault::get_git_sync_status,
            // Git repo management commands
            commands::vault::get_recent_git_repos,
            commands::vault::add_recent_git_repo,
            commands::vault::remove_recent_git_repo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
