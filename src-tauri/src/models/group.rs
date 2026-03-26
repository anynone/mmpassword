//! Group model for organizing entries

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A group for organizing entries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    /// Unique identifier
    pub id: Uuid,
    /// Group name
    pub name: String,
    /// Icon identifier (Material Symbols icon name)
    pub icon: Option<String>,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last modification timestamp
    pub updated_at: DateTime<Utc>,
}

impl Group {
    /// Create a new group
    pub fn new(name: impl Into<String>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            icon: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Set the icon
    pub fn with_icon(mut self, icon: impl Into<String>) -> Self {
        self.icon = Some(icon.into());
        self.updated_at = Utc::now();
        self
    }

    /// Update the group timestamp
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
    }
}

/// Default groups that should be created in a new vault
impl Default for Group {
    fn default() -> Self {
        Self::new("All Entries").with_icon("database")
    }
}

/// Create default groups for a new vault
pub fn create_default_groups() -> Vec<Group> {
    vec![
        Group::new("All Entries").with_icon("database"),
        Group::new("Favorites").with_icon("star"),
        Group::new("Social Media").with_icon("share"),
        Group::new("Bank Accounts").with_icon("account_balance"),
        Group::new("Work").with_icon("work"),
    ]
}
