use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ── Field ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Field {
    pub name: String,
    pub value: String,
    pub field_type: String,
    #[serde(default)]
    pub protected: bool,
}

// ── Entry ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub title: String,
    pub entry_type: String,
    pub group_id: Option<String>,
    pub fields: Vec<Field>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEntryRequest {
    pub title: String,
    #[serde(default = "default_entry_type")]
    pub entry_type: String,
    pub group_id: Option<String>,
    #[serde(default)]
    pub fields: Vec<Field>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default, alias = "isFavorite")]
    pub favorite: bool,
    pub icon: Option<String>,
}

fn default_entry_type() -> String {
    "websiteLogin".to_string()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEntryRequest {
    pub title: Option<String>,
    pub entry_type: Option<String>,
    pub group_id: Option<Option<String>>,
    pub fields: Option<Vec<Field>>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub icon: Option<Option<String>>,
}

// ── Group ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGroupRequest {
    pub name: String,
    pub icon: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGroupRequest {
    pub name: Option<String>,
    pub icon: Option<Option<String>>,
}

// ── Subscription ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub id: i64,
    pub token: String,
    pub name: String,
    pub description: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionWithUrl {
    pub id: i64,
    pub token: String,
    pub url: String,
    pub name: String,
    pub description: Option<String>,
    pub expires_at: Option<String>,
    pub entry_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSubscriptionRequest {
    pub name: String,
    pub description: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubscriptionRequest {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub expires_at: Option<Option<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetSubscriptionEntriesRequest {
    pub entry_ids: Vec<String>,
}

// ── Vault (for encryption output, camelCase) ──

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultJson {
    pub id: String,
    pub name: String,
    pub version: u32,
    pub description: Option<String>,
    pub groups: Vec<Group>,
    pub entries: Vec<Entry>,
    pub trash: Vec<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
