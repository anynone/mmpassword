//! Vault model for the password database

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{Entry, Group};

/// Current vault format version
pub const VAULT_VERSION: u32 = 1;

/// A password vault containing entries and groups
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vault {
    /// Unique identifier
    pub id: Uuid,
    /// Vault name
    pub name: String,
    /// Format version
    pub version: u32,
    /// Description
    pub description: Option<String>,
    /// Groups in this vault
    pub groups: Vec<Group>,
    /// Entries in this vault
    pub entries: Vec<Entry>,
    /// Trash entries (soft-deleted)
    pub trash: Vec<Entry>,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last modification timestamp
    pub updated_at: DateTime<Utc>,
}

impl Vault {
    /// Create a new vault
    pub fn new(name: impl Into<String>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            version: VAULT_VERSION,
            description: None,
            groups: super::group::create_default_groups(),
            entries: Vec::new(),
            trash: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Set description
    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self.updated_at = Utc::now();
        self
    }

    /// Update the vault timestamp
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
    }

    /// Get all entries (excluding trash)
    pub fn all_entries(&self) -> impl Iterator<Item = &Entry> {
        self.entries.iter()
    }

    /// Get entries by group
    pub fn entries_by_group(&self, group_id: Option<Uuid>) -> impl Iterator<Item = &Entry> {
        self.entries.iter().filter(move |e| e.group_id == group_id)
    }

    /// Get favorite entries
    pub fn favorite_entries(&self) -> impl Iterator<Item = &Entry> {
        self.entries.iter().filter(|e| e.favorite)
    }

    /// Get an entry by ID
    pub fn get_entry(&self, id: Uuid) -> Option<&Entry> {
        self.entries.iter().find(|e| e.id == id)
    }

    /// Get an entry by ID (mutable)
    pub fn get_entry_mut(&mut self, id: Uuid) -> Option<&mut Entry> {
        self.entries.iter_mut().find(|e| e.id == id)
    }

    /// Add an entry
    pub fn add_entry(&mut self, mut entry: Entry) {
        entry.created_at = Utc::now();
        entry.updated_at = Utc::now();
        self.entries.push(entry);
        self.touch();
    }

    /// Update an entry
    pub fn update_entry(&mut self, id: Uuid, update: super::entry::UpdateEntryRequest) -> bool {
        if let Some(entry) = self.get_entry_mut(id) {
            entry.title = update.title;
            entry.group_id = update.group_id;
            entry.fields = update.fields;
            entry.tags = update.tags;
            entry.favorite = update.favorite;
            entry.touch();
            self.touch();
            true
        } else {
            false
        }
    }

    /// Move an entry to trash
    pub fn trash_entry(&mut self, id: Uuid) -> bool {
        if let Some(pos) = self.entries.iter().position(|e| e.id == id) {
            let entry = self.entries.remove(pos);
            self.trash.push(entry);
            self.touch();
            true
        } else {
            false
        }
    }

    /// Permanently delete an entry from trash
    pub fn delete_entry_permanently(&mut self, id: Uuid) -> bool {
        if let Some(pos) = self.trash.iter().position(|e| e.id == id) {
            self.trash.remove(pos);
            self.touch();
            true
        } else {
            false
        }
    }

    /// Restore an entry from trash
    pub fn restore_entry(&mut self, id: Uuid) -> bool {
        if let Some(pos) = self.trash.iter().position(|e| e.id == id) {
            let entry = self.trash.remove(pos);
            self.entries.push(entry);
            self.touch();
            true
        } else {
            false
        }
    }

    /// Empty the trash
    pub fn empty_trash(&mut self) {
        self.trash.clear();
        self.touch();
    }

    /// Get a group by ID
    pub fn get_group(&self, id: Uuid) -> Option<&Group> {
        self.groups.iter().find(|g| g.id == id)
    }

    /// Get a group by ID (mutable)
    pub fn get_group_mut(&mut self, id: Uuid) -> Option<&mut Group> {
        self.groups.iter_mut().find(|g| g.id == id)
    }

    /// Add a group
    pub fn add_group(&mut self, mut group: Group) {
        group.created_at = Utc::now();
        group.updated_at = Utc::now();
        self.groups.push(group);
        self.touch();
    }

    /// Update a group
    pub fn update_group(&mut self, id: Uuid, name: String, icon: Option<String>) -> bool {
        if let Some(group) = self.get_group_mut(id) {
            group.name = name;
            group.icon = icon;
            group.touch();
            self.touch();
            true
        } else {
            false
        }
    }

    /// Delete a group (entries are moved to root)
    pub fn delete_group(&mut self, id: Uuid) -> bool {
        if let Some(pos) = self.groups.iter().position(|g| g.id == id) {
            self.groups.remove(pos);
            // Move entries in this group to root
            for entry in &mut self.entries {
                if entry.group_id == Some(id) {
                    entry.group_id = None;
                    entry.touch();
                }
            }
            self.touch();
            true
        } else {
            false
        }
    }
}

/// Metadata about a vault (without sensitive data)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultMeta {
    /// File path
    pub path: String,
    /// Vault name
    pub name: String,
    /// Last accessed timestamp
    pub last_accessed: DateTime<Utc>,
    /// Whether this is a GitHub-synced vault
    pub is_github: bool,
}

impl VaultMeta {
    /// Create new vault metadata
    pub fn new(path: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            name: name.into(),
            last_accessed: Utc::now(),
            is_github: false,
        }
    }
}
