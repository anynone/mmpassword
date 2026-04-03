use std::path::Path;

use chrono::Utc;
use chrono::{DateTime, NaiveDateTime};
use rand::Rng;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{
    CreateEntryRequest, CreateGroupRequest, CreateSubscriptionRequest, Entry, Group,
    Subscription, SubscriptionWithUrl, UpdateEntryRequest,
    UpdateGroupRequest, UpdateSubscriptionRequest, VaultJson,
};

// ── Helper struct for groups with entry count ──

#[derive(Debug)]
pub struct GroupWithCount {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub entry_count: i64,
}

// ── DDL ──

const DDL: &str = r#"
CREATE TABLE IF NOT EXISTS groups (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    icon        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entries (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    entry_type  TEXT NOT NULL DEFAULT 'websiteLogin',
    group_id    TEXT REFERENCES groups(id) ON DELETE SET NULL,
    fields      TEXT NOT NULL DEFAULT '[]',
    tags        TEXT NOT NULL DEFAULT '[]',
    favorite    INTEGER NOT NULL DEFAULT 0,
    icon        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token       TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    expires_at  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_entries (
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    entry_id        TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    PRIMARY KEY (subscription_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_group ON entries(group_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_token ON subscriptions(token);
CREATE INDEX IF NOT EXISTS idx_sub_entries_sub ON subscription_entries(subscription_id);
"#;

// ── Helpers ──

fn generate_token() -> String {
    const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}

/// Parse a datetime string, trying RFC3339 first, then SQLite datetime format.
fn parse_datetime(s: &str) -> DateTime<Utc> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return dt.with_timezone(&Utc);
    }
    if let Ok(naive) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        return naive.and_utc();
    }
    Utc::now()
}

fn row_to_entry(row: &rusqlite::Row<'_>) -> Result<Entry, rusqlite::Error> {
    let fields_str: String = row.get("fields")?;
    let tags_str: String = row.get("tags")?;
    let favorite_int: i32 = row.get("favorite")?;

    Ok(Entry {
        id: row.get("id")?,
        title: row.get("title")?,
        entry_type: row.get("entry_type")?,
        group_id: row.get("group_id")?,
        fields: serde_json::from_str(&fields_str)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(e.into()))?,
        tags: serde_json::from_str(&tags_str)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(e.into()))?,
        favorite: favorite_int != 0,
        icon: row.get("icon")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_group(row: &rusqlite::Row<'_>) -> Result<Group, rusqlite::Error> {
    Ok(Group {
        id: row.get("id")?,
        name: row.get("name")?,
        icon: row.get("icon")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_subscription(row: &rusqlite::Row<'_>) -> Result<Subscription, rusqlite::Error> {
    Ok(Subscription {
        id: row.get("id")?,
        token: row.get("token")?,
        name: row.get("name")?,
        description: row.get("description")?,
        expires_at: row.get("expires_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn subscription_to_with_url(sub: &Subscription, base_url: &str, entry_count: i64) -> SubscriptionWithUrl {
    SubscriptionWithUrl {
        id: sub.id,
        token: sub.token.clone(),
        url: format!("{}/api/sub/{}", base_url.trim_end_matches('/'), sub.token),
        name: sub.name.clone(),
        description: sub.description.clone(),
        expires_at: sub.expires_at.clone(),
        entry_count,
        created_at: sub.created_at.clone(),
        updated_at: sub.updated_at.clone(),
    }
}

// ── Init ──

pub fn init(db_path: &Path) -> Result<Connection, AppError> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let conn = Connection::open(db_path).map_err(|e| AppError::Internal(e.to_string()))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys = ON;")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    conn.execute_batch(DDL)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(conn)
}

// ── Entry CRUD ──

pub fn insert_entry(conn: &Connection, req: &CreateEntryRequest) -> Result<Entry, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = now_rfc3339();
    let fields_json = serde_json::to_string(&req.fields)?;
    let tags_json = serde_json::to_string(&req.tags)?;

    conn.execute(
        "INSERT INTO entries (id, title, entry_type, group_id, fields, tags, favorite, icon, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![id, req.title, req.entry_type, req.group_id, fields_json, tags_json, req.favorite as i32, req.icon, now, now],
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    get_entry_by_id(conn, &id)
}

pub fn get_all_entries(conn: &Connection) -> Result<Vec<Entry>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, entry_type, group_id, fields, tags, favorite, icon, created_at, updated_at
         FROM entries ORDER BY updated_at DESC",
    ).map_err(|e| AppError::Internal(e.to_string()))?;
    let entries = stmt.query_map([], row_to_entry)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(entries)
}

pub fn get_entry_by_id(conn: &Connection, id: &str) -> Result<Entry, AppError> {
    conn.query_row(
        "SELECT id, title, entry_type, group_id, fields, tags, favorite, icon, created_at, updated_at
         FROM entries WHERE id = ?1",
        params![id],
        row_to_entry,
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("entry not found: {}", id)),
        other => AppError::Internal(other.to_string()),
    })
}

pub fn update_entry(conn: &Connection, id: &str, req: &UpdateEntryRequest) -> Result<Entry, AppError> {
    let _existing = get_entry_by_id(conn, id)?;
    let now = now_rfc3339();

    let mut set_clauses: Vec<String> = vec!["updated_at = ?1".to_string()];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];
    let mut param_idx = 2;

    if let Some(ref title) = req.title {
        set_clauses.push(format!("title = ?{}", param_idx));
        param_values.push(Box::new(title.clone()));
        param_idx += 1;
    }
    if let Some(ref entry_type) = req.entry_type {
        set_clauses.push(format!("entry_type = ?{}", param_idx));
        param_values.push(Box::new(entry_type.clone()));
        param_idx += 1;
    }
    if let Some(ref group_id_opt) = req.group_id {
        set_clauses.push(format!("group_id = ?{}", param_idx));
        match group_id_opt {
            Some(gid) => param_values.push(Box::new(gid.clone())),
            None => param_values.push(Box::new(Option::<String>::None)),
        }
        param_idx += 1;
    }
    if let Some(ref fields) = req.fields {
        let fields_json = serde_json::to_string(fields)?;
        set_clauses.push(format!("fields = ?{}", param_idx));
        param_values.push(Box::new(fields_json));
        param_idx += 1;
    }
    if let Some(ref tags) = req.tags {
        let tags_json = serde_json::to_string(tags)?;
        set_clauses.push(format!("tags = ?{}", param_idx));
        param_values.push(Box::new(tags_json));
        param_idx += 1;
    }
    if let Some(favorite) = req.favorite {
        set_clauses.push(format!("favorite = ?{}", param_idx));
        param_values.push(Box::new(favorite as i32));
        param_idx += 1;
    }
    if let Some(ref icon_opt) = req.icon {
        set_clauses.push(format!("icon = ?{}", param_idx));
        match icon_opt {
            Some(icon) => param_values.push(Box::new(icon.clone())),
            None => param_values.push(Box::new(Option::<String>::None)),
        }
        param_idx += 1;
    }

    let where_idx = param_idx;
    let sql = format!("UPDATE entries SET {} WHERE id = ?{}", set_clauses.join(", "), where_idx);
    param_values.push(Box::new(id.to_string()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| AppError::Internal(e.to_string()))?;

    get_entry_by_id(conn, id)
}

pub fn delete_entry(conn: &Connection, id: &str) -> Result<(), AppError> {
    let _existing = get_entry_by_id(conn, id)?;
    conn.execute("DELETE FROM subscription_entries WHERE entry_id = ?1", params![id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    conn.execute("DELETE FROM entries WHERE id = ?1", params![id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

// ── Group CRUD ──

pub fn insert_group(conn: &Connection, req: &CreateGroupRequest) -> Result<Group, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = now_rfc3339();

    conn.execute(
        "INSERT INTO groups (id, name, icon, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, req.name, req.icon, now, now],
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    conn.query_row(
        "SELECT id, name, icon, created_at, updated_at FROM groups WHERE id = ?1",
        params![id],
        row_to_group,
    ).map_err(|e| AppError::Internal(e.to_string()))
}

pub fn get_all_groups(conn: &Connection) -> Result<Vec<GroupWithCount>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT g.id, g.name, g.icon, g.created_at, g.updated_at,
                COUNT(e.id) AS entry_count
         FROM groups g
         LEFT JOIN entries e ON e.group_id = g.id
         GROUP BY g.id
         ORDER BY g.name",
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    let groups = stmt.query_map([], |row| {
        Ok(GroupWithCount {
            id: row.get("id")?,
            name: row.get("name")?,
            icon: row.get("icon")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            entry_count: row.get("entry_count")?,
        })
    }).map_err(|e| AppError::Internal(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(groups)
}

pub fn update_group(conn: &Connection, id: &str, req: &UpdateGroupRequest) -> Result<Group, AppError> {
    let _existing: Group = conn.query_row(
        "SELECT id, name, icon, created_at, updated_at FROM groups WHERE id = ?1",
        params![id],
        row_to_group,
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("group not found: {}", id)),
        other => AppError::Internal(other.to_string()),
    })?;

    let now = now_rfc3339();
    let mut set_clauses: Vec<String> = vec!["updated_at = ?1".to_string()];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];
    let mut param_idx = 2;

    if let Some(ref name) = req.name {
        set_clauses.push(format!("name = ?{}", param_idx));
        param_values.push(Box::new(name.clone()));
        param_idx += 1;
    }
    if let Some(ref icon_opt) = req.icon {
        set_clauses.push(format!("icon = ?{}", param_idx));
        match icon_opt {
            Some(icon) => param_values.push(Box::new(icon.clone())),
            None => param_values.push(Box::new(Option::<String>::None)),
        }
        param_idx += 1;
    }

    let where_idx = param_idx;
    let sql = format!("UPDATE groups SET {} WHERE id = ?{}", set_clauses.join(", "), where_idx);
    param_values.push(Box::new(id.to_string()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| AppError::Internal(e.to_string()))?;

    conn.query_row(
        "SELECT id, name, icon, created_at, updated_at FROM groups WHERE id = ?1",
        params![id],
        row_to_group,
    ).map_err(|e| AppError::Internal(e.to_string()))
}

pub fn delete_group(conn: &Connection, id: &str) -> Result<(), AppError> {
    let _existing: Group = conn.query_row(
        "SELECT id, name, icon, created_at, updated_at FROM groups WHERE id = ?1",
        params![id],
        row_to_group,
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("group not found: {}", id)),
        other => AppError::Internal(other.to_string()),
    })?;

    // Cascade: set entries.group_id = NULL
    conn.execute(
        "UPDATE entries SET group_id = NULL, updated_at = ?1 WHERE group_id = ?2",
        params![now_rfc3339(), id],
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    conn.execute("DELETE FROM groups WHERE id = ?1", params![id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

// ── Subscription CRUD ──

pub fn insert_subscription(conn: &Connection, req: &CreateSubscriptionRequest, base_url: &str) -> Result<SubscriptionWithUrl, AppError> {
    let token = generate_token();
    let now = now_rfc3339();

    conn.execute(
        "INSERT INTO subscriptions (token, name, description, expires_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![token, req.name, req.description, req.expires_at, now, now],
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    let sub_id = conn.last_insert_rowid();
    let sub = Subscription {
        id: sub_id, token, name: req.name.clone(), description: req.description.clone(),
        expires_at: req.expires_at.clone(), created_at: now.clone(), updated_at: now,
    };
    Ok(subscription_to_with_url(&sub, base_url, 0))
}

pub fn get_all_subscriptions(conn: &Connection, base_url: &str) -> Result<Vec<SubscriptionWithUrl>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.token, s.name, s.description, s.expires_at, s.created_at, s.updated_at,
                COUNT(se.entry_id) AS entry_count
         FROM subscriptions s
         LEFT JOIN subscription_entries se ON se.subscription_id = s.id
         GROUP BY s.id
         ORDER BY s.created_at DESC",
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    let subs = stmt.query_map([], |row| {
        let sub = Subscription {
            id: row.get("id")?, token: row.get("token")?, name: row.get("name")?,
            description: row.get("description")?, expires_at: row.get("expires_at")?,
            created_at: row.get("created_at")?, updated_at: row.get("updated_at")?,
        };
        let entry_count: i64 = row.get("entry_count")?;
        Ok((sub, entry_count))
    }).map_err(|e| AppError::Internal(e.to_string()))?;

    let result: Vec<SubscriptionWithUrl> = subs
        .collect::<Result<Vec<_>, _>>().map_err(|e| AppError::Internal(e.to_string()))?
        .into_iter()
        .map(|(sub, count)| subscription_to_with_url(&sub, base_url, count))
        .collect();

    Ok(result)
}

fn find_subscription_by_token(conn: &Connection, token: &str) -> Result<Subscription, AppError> {
    conn.query_row(
        "SELECT id, token, name, description, expires_at, created_at, updated_at FROM subscriptions WHERE token = ?1",
        params![token],
        row_to_subscription,
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("subscription not found: {}", token)),
        other => AppError::Internal(other.to_string()),
    })
}

fn get_entry_count_for_sub(conn: &Connection, sub_id: i64) -> Result<i64, AppError> {
    conn.query_row(
        "SELECT COUNT(entry_id) FROM subscription_entries WHERE subscription_id = ?1",
        params![sub_id],
        |row| row.get(0),
    ).map_err(|e| AppError::Internal(e.to_string()))
}

pub fn get_subscription_by_token(conn: &Connection, token: &str) -> Result<Subscription, AppError> {
    let sub = find_subscription_by_token(conn, token)?;

    // Check expiry
    if let Some(ref expires_at) = sub.expires_at {
        if let Ok(expiry) = chrono::DateTime::parse_from_rfc3339(expires_at) {
            if expiry.with_timezone(&Utc) < Utc::now() {
                return Err(AppError::Gone("subscription expired".to_string()));
            }
        }
    }

    Ok(sub)
}

pub fn update_subscription(conn: &Connection, token: &str, req: &UpdateSubscriptionRequest) -> Result<Subscription, AppError> {
    let existing = find_subscription_by_token(conn, token)?;
    let now = now_rfc3339();

    let mut set_clauses: Vec<String> = vec!["updated_at = ?1".to_string()];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];
    let mut param_idx = 2;

    if let Some(ref name) = req.name {
        set_clauses.push(format!("name = ?{}", param_idx));
        param_values.push(Box::new(name.clone()));
        param_idx += 1;
    }
    if let Some(ref desc_opt) = req.description {
        set_clauses.push(format!("description = ?{}", param_idx));
        match desc_opt {
            Some(d) => param_values.push(Box::new(d.clone())),
            None => param_values.push(Box::new(Option::<String>::None)),
        }
        param_idx += 1;
    }
    if let Some(ref exp_opt) = req.expires_at {
        set_clauses.push(format!("expires_at = ?{}", param_idx));
        match exp_opt {
            Some(e) => param_values.push(Box::new(e.clone())),
            None => param_values.push(Box::new(Option::<String>::None)),
        }
        param_idx += 1;
    }

    let where_idx = param_idx;
    let sql = format!("UPDATE subscriptions SET {} WHERE id = ?{}", set_clauses.join(", "), where_idx);
    param_values.push(Box::new(existing.id));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| AppError::Internal(e.to_string()))?;

    find_subscription_by_token(conn, token)
}

pub fn delete_subscription(conn: &Connection, token: &str) -> Result<(), AppError> {
    let existing = find_subscription_by_token(conn, token)?;
    conn.execute("DELETE FROM subscription_entries WHERE subscription_id = ?1", params![existing.id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    conn.execute("DELETE FROM subscriptions WHERE id = ?1", params![existing.id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

pub fn refresh_subscription_token(conn: &Connection, token: &str, base_url: &str) -> Result<SubscriptionWithUrl, AppError> {
    let existing = find_subscription_by_token(conn, token)?;
    let new_token = generate_token();
    let now = now_rfc3339();

    conn.execute(
        "UPDATE subscriptions SET token = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_token, now, existing.id],
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    let sub = find_subscription_by_token(conn, &new_token)?;
    let count = get_entry_count_for_sub(conn, sub.id)?;
    Ok(subscription_to_with_url(&sub, base_url, count))
}

pub fn set_subscription_entries(conn: &Connection, token: &str, entry_ids: &[String]) -> Result<(), AppError> {
    let sub = find_subscription_by_token(conn, token)?;

    conn.execute("DELETE FROM subscription_entries WHERE subscription_id = ?1", params![sub.id])
        .map_err(|e| AppError::Internal(e.to_string()))?;

    for entry_id in entry_ids {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM entries WHERE id = ?1",
            params![entry_id],
            |row| { let c: i64 = row.get(0)?; Ok(c > 0) },
        ).unwrap_or(false);

        if exists {
            conn.execute(
                "INSERT INTO subscription_entries (subscription_id, entry_id) VALUES (?1, ?2)",
                params![sub.id, entry_id],
            ).map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }

    conn.execute("UPDATE subscriptions SET updated_at = ?1 WHERE id = ?2", params![now_rfc3339(), sub.id])
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

pub fn get_subscription_entry_ids(conn: &Connection, token: &str) -> Result<Vec<String>, AppError> {
    let sub = find_subscription_by_token(conn, token)?;
    let mut stmt = conn.prepare(
        "SELECT entry_id FROM subscription_entries WHERE subscription_id = ?1",
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    let ids: Vec<String> = stmt.query_map(params![sub.id], |row| row.get(0))
        .map_err(|e| AppError::Internal(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(ids)
}

pub fn build_vault_for_subscription(conn: &Connection, token: &str) -> Result<VaultJson, AppError> {
    let sub = get_subscription_by_token(conn, token)?;
    let entry_ids = get_subscription_entry_ids(conn, token)?;
    let vault_id = Uuid::new_v5(&Uuid::NAMESPACE_URL, token.as_bytes()).to_string();

    if entry_ids.is_empty() {
        return Ok(VaultJson {
            id: vault_id, name: sub.name.clone(), version: 1,
            description: sub.description.clone(), groups: vec![], entries: vec![], trash: vec![],
            created_at: parse_datetime(&sub.created_at), updated_at: parse_datetime(&sub.updated_at),
        });
    }

    // Query selected entries
    let placeholders: Vec<String> = entry_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
    let sql = format!(
        "SELECT id, title, entry_type, group_id, fields, tags, favorite, icon, created_at, updated_at
         FROM entries WHERE id IN ({})", placeholders.join(", ")
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| AppError::Internal(e.to_string()))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = entry_ids.iter().map(|id| id as &dyn rusqlite::types::ToSql).collect();
    let entries: Vec<Entry> = stmt.query_map(param_refs.as_slice(), row_to_entry)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Collect unique group_ids
    let mut unique_group_ids: Vec<String> = entries.iter()
        .filter_map(|e| e.group_id.clone())
        .collect();
    unique_group_ids.sort();
    unique_group_ids.dedup();

    // Query groups
    let groups: Vec<Group> = if unique_group_ids.is_empty() {
        vec![]
    } else {
        let g_placeholders: Vec<String> = unique_group_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
        let g_sql = format!(
            "SELECT id, name, icon, created_at, updated_at FROM groups WHERE id IN ({})",
            g_placeholders.join(", ")
        );
        let g_param_refs: Vec<&dyn rusqlite::types::ToSql> = unique_group_ids.iter().map(|id| id as &dyn rusqlite::types::ToSql).collect();
        let mut g_stmt = conn.prepare(&g_sql).map_err(|e| AppError::Internal(e.to_string()))?;
        let mapped = g_stmt.query_map(g_param_refs.as_slice(), row_to_group)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let mut groups_result = Vec::new();
        for row in mapped {
            groups_result.push(row.map_err(|e| AppError::Internal(e.to_string()))?);
        }
        groups_result
    };

    Ok(VaultJson {
        id: vault_id, name: sub.name.clone(), version: 1,
        description: sub.description.clone(), groups, entries, trash: vec![],
        created_at: parse_datetime(&sub.created_at), updated_at: Utc::now(),
    })
}
