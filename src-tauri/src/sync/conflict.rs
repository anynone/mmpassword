//! Conflict detection and resolution for vault sync

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::Entry;

/// Types of sync conflicts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Conflict {
    /// Entry was modified both locally and remotely
    EntryModifiedBoth {
        entry_id: Uuid,
        local: EntryInfo,
        remote: EntryInfo,
    },
    /// Entry was deleted remotely but modified locally
    EntryDeletedRemote {
        entry_id: Uuid,
        local: EntryInfo,
    },
    /// Entry was deleted locally but modified remotely
    EntryDeletedLocal {
        entry_id: Uuid,
        remote: EntryInfo,
    },
    /// Group was modified both locally and remotely
    GroupModifiedBoth {
        group_id: Uuid,
        local_name: String,
        remote_name: String,
    },
    /// Group was deleted remotely but modified locally
    GroupDeletedRemote {
        group_id: Uuid,
        local_name: String,
    },
    /// Group was deleted locally but modified remotely
    GroupDeletedLocal {
        group_id: Uuid,
        remote_name: String,
    },
}

/// Simplified entry info for conflict reporting
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryInfo {
    pub title: String,
    pub username: Option<String>,
    pub updated_at: DateTime<Utc>,
}

use crate::models::FieldType;

impl From<&Entry> for EntryInfo {
    fn from(entry: &Entry) -> Self {
        Self {
            title: entry.title.clone(),
            username: entry.fields.iter()
                .find(|f| matches!(f.field_type, FieldType::Text))
                .map(|f| f.value.clone()),
            updated_at: entry.updated_at,
        }
    }
}

/// Strategy for resolving conflicts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConflictStrategy {
    /// Always prefer the newest version based on updated_at
    PreferNewest,
    /// Always prefer the local version
    PreferLocal,
    /// Always prefer the remote version
    PreferRemote,
    /// Ask user for each conflict
    Manual,
}

impl Default for ConflictStrategy {
    fn default() -> Self {
        Self::PreferNewest
    }
}

/// Resolution for a specific conflict
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "resolution", rename_all = "camelCase")]
pub enum ConflictResolution {
    /// Use the local version
    UseLocal,
    /// Use the remote version
    UseRemote,
    /// Keep both (creates a copy of the local version with a new ID)
    KeepBoth,
    /// Skip this item (don't sync it)
    Skip,
}

/// Result of conflict resolution
#[derive(Debug, Clone, Default)]
pub struct ConflictResolutionResult {
    /// Number of conflicts resolved automatically
    pub auto_resolved: usize,
    /// Number of conflicts that need manual resolution
    pub manual_required: usize,
    /// Conflicts that need manual resolution
    pub pending_conflicts: Vec<Conflict>,
}

impl ConflictResolutionResult {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_empty(&self) -> bool {
        self.auto_resolved == 0 && self.manual_required == 0
    }
}
