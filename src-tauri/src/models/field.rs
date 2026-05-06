//! Field model for password entries

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Field types for entry fields
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum FieldType {
    /// Plain text field
    Text,
    /// Password field (hidden by default)
    Password,
    /// URL field
    Url,
    /// Email field
    Email,
    /// Multi-line notes
    Notes,
    /// Username field
    Username,
}

/// A historical password value with its change timestamp
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordHistoryEntry {
    /// Previous password value
    pub value: String,
    /// When this password was replaced
    pub changed_at: DateTime<Utc>,
}

/// Maximum number of password history entries per field
pub const MAX_PASSWORD_HISTORY: usize = 3;

/// A field within an entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Field {
    /// Field name/label
    pub name: String,
    /// Field value
    pub value: String,
    /// Field type
    pub field_type: FieldType,
    /// Whether the field is protected (sensitive)
    pub protected: bool,
    /// History of previous password values (only for password-type fields)
    #[serde(default)]
    pub password_history: Vec<PasswordHistoryEntry>,
}

impl Field {
    /// Create a new field
    pub fn new(name: impl Into<String>, value: impl Into<String>, field_type: FieldType) -> Self {
        Self {
            name: name.into(),
            value: value.into(),
            field_type,
            protected: matches!(field_type, FieldType::Password),
            password_history: Vec::new(),
        }
    }

    /// Create a username field
    pub fn username(value: impl Into<String>) -> Self {
        Self::new("Username", value, FieldType::Username)
    }

    /// Create a password field
    pub fn password(value: impl Into<String>) -> Self {
        Self::new("Password", value, FieldType::Password)
    }

    /// Create a URL field
    pub fn url(value: impl Into<String>) -> Self {
        Self::new("Website", value, FieldType::Url)
    }

    /// Create an email field
    pub fn email(value: impl Into<String>) -> Self {
        Self::new("Email", value, FieldType::Email)
    }

    /// Create a notes field
    pub fn notes(value: impl Into<String>) -> Self {
        Self::new("Notes", value, FieldType::Notes)
    }
}
