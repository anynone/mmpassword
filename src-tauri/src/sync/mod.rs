//! Sync module for GitHub vault synchronization
//!
//! This module provides synchronization functionality between local and remote vaults.

pub mod engine;
pub mod conflict;

pub use engine::SyncEngine;
pub use conflict::{Conflict, ConflictStrategy, ConflictResolution};
