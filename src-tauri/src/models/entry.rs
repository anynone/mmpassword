//! Entry model for password entries

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Field;

/// Entry types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum EntryType {
    /// Website login credentials
    WebsiteLogin,
    /// Secure text note
    SecureNote,
}

/// A password entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    /// Unique identifier
    pub id: Uuid,
    /// Entry title
    pub title: String,
    /// Entry type
    pub entry_type: EntryType,
    /// Group ID this entry belongs to (None for root)
    pub group_id: Option<Uuid>,
    /// Custom fields
    pub fields: Vec<Field>,
    /// Tags for organization
    pub tags: Vec<String>,
    /// Whether this is a favorite entry
    pub favorite: bool,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last modification timestamp
    pub updated_at: DateTime<Utc>,
    /// Icon name or identifier
    pub icon: Option<String>,
    /// TOTP secret key (base32 encoded)
    /// None = MFA not configured
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub totp_secret: Option<String>,
}

impl Entry {
    /// Create a new entry
    pub fn new(title: impl Into<String>, entry_type: EntryType) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            title: title.into(),
            entry_type,
            group_id: None,
            fields: Vec::new(),
            tags: Vec::new(),
            favorite: false,
            created_at: now,
            updated_at: now,
            icon: None,
            totp_secret: None,
        }
    }

    /// Create a website login entry
    pub fn website_login(title: impl Into<String>) -> Self {
        Self::new(title, EntryType::WebsiteLogin)
    }

    /// Create a secure note entry
    pub fn secure_note(title: impl Into<String>) -> Self {
        Self::new(title, EntryType::SecureNote)
    }

    /// Set the group for this entry
    pub fn with_group(mut self, group_id: Uuid) -> Self {
        self.group_id = Some(group_id);
        self.updated_at = Utc::now();
        self
    }

    /// Add a field to this entry
    pub fn with_field(mut self, field: Field) -> Self {
        self.fields.push(field);
        self.updated_at = Utc::now();
        self
    }

    /// Add a tag to this entry
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tags.push(tag.into());
        self.updated_at = Utc::now();
        self
    }

    /// Mark as favorite
    pub fn with_favorite(mut self, favorite: bool) -> Self {
        self.favorite = favorite;
        self.updated_at = Utc::now();
        self
    }

    /// Update the entry timestamp
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
    }

    /// Get a field value by name
    pub fn get_field(&self, name: &str) -> Option<&Field> {
        self.fields.iter().find(|f| f.name == name)
    }

    /// Get the username (if present)
    pub fn username(&self) -> Option<&str> {
        self.get_field("Username").map(|f| f.value.as_str())
    }

    /// Get the password (if present)
    pub fn password(&self) -> Option<&str> {
        self.get_field("Password").map(|f| f.value.as_str())
    }

    /// Get the URL (if present)
    pub fn url(&self) -> Option<&str> {
        self.get_field("Website").map(|f| f.value.as_str())
    }
}

/// Request to create a new entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEntryRequest {
    pub title: String,
    pub entry_type: EntryType,
    pub group_id: Option<Uuid>,
    pub fields: Vec<Field>,
    pub tags: Vec<String>,
    pub favorite: bool,
}

/// Request to update an existing entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEntryRequest {
    pub title: String,
    pub group_id: Option<Uuid>,
    pub fields: Vec<Field>,
    pub tags: Vec<String>,
    pub favorite: bool,
}
