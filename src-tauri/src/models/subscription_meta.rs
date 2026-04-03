//! Subscription metadata for recent subscription URLs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Metadata for a subscription URL history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionMeta {
    /// Subscription URL
    pub url: String,
    /// Vault name from the subscription
    pub name: String,
    /// Number of entries in the subscription vault
    pub entry_count: usize,
    /// Last accessed timestamp
    pub last_accessed: DateTime<Utc>,
}

impl SubscriptionMeta {
    /// Create a new subscription metadata
    pub fn new(url: String, name: String, entry_count: usize) -> Self {
        Self {
            url,
            name,
            entry_count,
            last_accessed: Utc::now(),
        }
    }
}
