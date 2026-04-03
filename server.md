# mmpassword 订阅服务器实现方案

## 1. 概述

订阅服务器为 mmpassword 客户端提供密码库订阅推送功能。

**核心流程：**
```
管理员在服务端维护密码条目 → 客户端通过订阅URL拉取 → 服务端临时加密返回 .mmp 格式 → 客户端解密展示（只读）
```

**设计约束：**
- 客户端与服务端共享密码字符串，用于 Argon2id 密钥派生 + ChaCha20-Poly1305 加解密
- 加密数据格式与本地 .mmp 文件完全一致
- 客户端仅在内存中解密，不落盘
- 订阅条目只读，不可编辑
- 单次拉取，不支持同时多订阅激活

---

## 2. 系统架构

```
┌────────────────────────────────────────────────────────┐
│                  Subscription Server                    │
│                                                        │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │  REST API  │  │   Crypto   │  │    Storage      │  │
│  │            │  │   Module   │  │                 │  │
│  │ /api/sub/  │  │            │  │    SQLite       │  │
│  │ /api/admin/│  │ Argon2id   │  │                 │  │
│  │            │  │ ChaCha20   │  │  subscriptions  │  │
│  └─────┬──────┘  │ -Poly1305  │  │  entries        │  │
│        │         └─────┬──────┘  │  groups         │  │
│        └───────────────┴─────────┴─────────────────┘  │
│                        │                               │
│              ┌─────────────────────┐                   │
│              │  共享密码 (配置文件)  │                   │
│              └─────────────────────┘                   │
└────────────────────────────────────────────────────────┘
```

---

## 3. API 规范

### 3.1 客户端接口

#### 获取订阅密码库

```
GET /api/sub/{token}

Response 200:
  Content-Type: text/plain
  Body: base64编码的 .mmp 文件二进制内容

Response 404:
  Body: {"error": "subscription not found"}

Response 410:
  Body: {"error": "subscription expired"}
```

- `{token}`: 订阅令牌，由服务端生成，长度 >= 32 字符，URL-safe
- 无需额外认证头（URL 即 Token）
- 服务端每次请求都重新加密（随机 salt + nonce），保证数据新鲜性

### 3.2 管理接口

管理接口需要 Bearer Token 认证。

#### 订阅管理

```
POST   /api/admin/subscriptions                    # 创建订阅
GET    /api/admin/subscriptions                    # 列出所有订阅
GET    /api/admin/subscriptions/{token}            # 查看订阅详情
PUT    /api/admin/subscriptions/{token}            # 更新订阅信息
DELETE /api/admin/subscriptions/{token}            # 删除订阅
POST   /api/admin/subscriptions/{token}/refresh    # 刷新令牌
```

**创建订阅请求体：**
```json
{
  "name": "团队共享密码库",
  "description": "开发团队共享的账号密码",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

**创建订阅响应：**
```json
{
  "token": "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6",
  "url": "https://your-server.com/api/sub/a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6",
  "name": "团队共享密码库",
  "created_at": "2026-03-31T10:00:00Z"
}
```

#### 条目管理

```
POST   /api/admin/subscriptions/{token}/entries              # 添加条目
GET    /api/admin/subscriptions/{token}/entries              # 列出条目
PUT    /api/admin/subscriptions/{token}/entries/{entry_id}   # 更新条目
DELETE /api/admin/subscriptions/{token}/entries/{entry_id}   # 删除条目
```

**条目请求体：**
```json
{
  "title": "Gmail 团队邮箱",
  "entry_type": "WebsiteLogin",
  "group_name": "邮箱",
  "fields": [
    {"name": "username", "value": "team@example.com", "field_type": "Username", "protected": false},
    {"name": "password", "value": "S3cur3P@ss!", "field_type": "Password", "protected": true},
    {"name": "url", "value": "https://mail.google.com", "field_type": "Url", "protected": false}
  ],
  "tags": ["email", "team"],
  "favorite": false,
  "icon": "email"
}
```

#### 分组管理

```
POST   /api/admin/subscriptions/{token}/groups              # 添加分组
GET    /api/admin/subscriptions/{token}/groups              # 列出分组
PUT    /api/admin/subscriptions/{token}/groups/{group_id}   # 更新分组
DELETE /api/admin/subscriptions/{token}/groups/{group_id}   # 删除分组
```

---

## 4. 数据模型

### 4.1 SQLite 表结构

```sql
-- 订阅表
CREATE TABLE subscriptions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token       TEXT    UNIQUE NOT NULL,        -- 订阅令牌 (>= 32 chars, URL-safe)
    name        TEXT    NOT NULL,               -- 订阅名称
    description TEXT,                           -- 描述
    expires_at  TEXT,                           -- 过期时间 (NULL = 永不过期)
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 订阅分组表
CREATE TABLE subscription_groups (
    id              TEXT    PRIMARY KEY,         -- UUID v4
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    icon            TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 订阅条目表
CREATE TABLE subscription_entries (
    id              TEXT    PRIMARY KEY,         -- UUID v4
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    entry_type      TEXT    NOT NULL DEFAULT 'WebsiteLogin',  -- 'WebsiteLogin' | 'SecureNote'
    group_id        TEXT    REFERENCES subscription_groups(id) ON DELETE SET NULL,
    fields          TEXT    NOT NULL DEFAULT '[]',             -- JSON array
    tags            TEXT    NOT NULL DEFAULT '[]',             -- JSON array
    favorite        INTEGER NOT NULL DEFAULT 0,               -- 0 = false, 1 = true
    icon            TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX idx_subscriptions_token ON subscriptions(token);
CREATE INDEX idx_entries_subscription ON subscription_entries(subscription_id);
CREATE INDEX idx_groups_subscription ON subscription_groups(subscription_id);
```

### 4.2 fields JSON 格式

`subscription_entries.fields` 列存储 JSON 数组，格式与客户端 `Field` 结构一致：

```json
[
  {
    "name": "username",
    "value": "team@example.com",
    "field_type": "Username",
    "protected": false
  },
  {
    "name": "password",
    "value": "S3cur3P@ss!",
    "field_type": "Password",
    "protected": true
  }
]
```

---

## 5. 加密协议

服务端加密必须与客户端完全兼容，使用相同的参数和格式。

### 5.1 参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 共享密码 | 配置文件中读取 | 服务端和客户端一致 |
| Argon2id m_cost | 65536 (64 MB) | 内存开销 |
| Argon2id t_cost | 3 | 迭代次数 |
| Argon2id p_cost | 4 | 并行度 |
| Argon2id output_len | 32 (256-bit) | 输出密钥长度 |
| Argon2id version | 0x13 | Argon2 版本 |
| 加密算法 | ChaCha20-Poly1305 | AEAD |
| Nonce 长度 | 12 bytes (96-bit) | 每次加密随机生成 |
| Salt 长度 | 16 bytes (128-bit) | 每次加密随机生成 |

### 5.2 加密流程（伪代码）

```
function encrypt_subscription(subscription, shared_password):
    // 1. 从数据库组装 Vault 对象
    vault = {
        id:         subscription.id (UUID),
        name:       subscription.name,
        version:    1,
        description: subscription.description,
        groups:     query_groups(subscription.id),
        entries:    query_entries(subscription.id),
        trash:      [],
        created_at: subscription.created_at,
        updated_at: subscription.updated_at,
    }

    // 2. 序列化为 JSON
    plaintext = json_serialize(vault)           // UTF-8 bytes

    // 3. 生成随机 Salt 和 Nonce
    salt  = random_bytes(16)                    // CSPRNG
    nonce = random_bytes(12)                    // CSPRNG

    // 4. Argon2id 密钥派生
    key = argon2id(
        password = shared_password,
        salt     = salt,
        m_cost   = 65536,
        t_cost   = 3,
        p_cost   = 4,
        output   = 32
    )

    // 5. ChaCha20-Poly1305 加密
    ciphertext = chacha20poly1305_encrypt(
        key      = key,                         // 32 bytes
        nonce    = nonce,                       // 12 bytes
        plaintext = plaintext
    )
    // ciphertext 包含 16 bytes auth tag

    // 6. 构建 .mmp 二进制格式
    binary = concat(
        b"MMP1",                               // Magic (4 bytes)
        1_u16_le,                              // Version (2 bytes)
        0_u16_le,                              // Reserved (2 bytes)
        salt,                                  // Salt (16 bytes)
        nonce,                                 // Nonce (12 bytes)
        ciphertext                             // Ciphertext + Tag (variable)
    )

    // 7. Base64 编码
    return base64_encode(binary)
```

### 5.3 二进制格式

```
偏移    长度     内容
──────────────────────────────────────────────
0x00    4       Magic: b"MMP1"
0x04    2       Version: 0x0100 (u16 LE)
0x06    2       Reserved: 0x0000
0x08    16      Salt (Argon2id)
0x18    12      Nonce (ChaCha20-Poly1305)
0x24    N       Ciphertext + 16-byte Auth Tag
──────────────────────────────────────────────
总长 = 8 + 16 + 12 + len(ciphertext) + 16
```

---

## 6. Rust 实现参考

### 6.1 技术栈

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
rusqlite = { version = "0.31", features = ["bundled"] }
argon2 = "0.5"
chacha20poly1305 = "0.10"
base64 = "0.22"
rand = "0.8"
tower-http = { version = "0.5", features = ["cors"] }
```

### 6.2 项目结构

```
subscription-server/
├── src/
│   ├── main.rs              # 入口，Axum 服务启动
│   ├── config.rs            # 配置加载（共享密码、端口、数据库路径）
│   ├── models.rs            # 数据模型定义
│   ├── db.rs                # SQLite 数据库操作
│   ├── crypto.rs            # 加密模块（Argon2id + ChaCha20）
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── subscription.rs  # GET /api/sub/{token} 客户端拉取
│   │   └── admin.rs         # 管理接口
│   └── error.rs             # 错误类型定义
├── config.toml              # 配置文件
└── Cargo.toml
```

### 6.3 配置文件

```toml
# config.toml
[server]
host = "0.0.0.0"
port = 3000

[security]
# 与客户端共享的密码字符串，必须一致
shared_password = "your-secure-shared-password-here"
# 管理员 API Token
admin_token = "admin-api-secret-token"

[database]
path = "./data/subscriptions.db"
```

### 6.4 加密模块核心实现

```rust
// src/crypto.rs

use argon2::{Argon2, Algorithm, Version, Params};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce, aead::Aead};
use rand::RngCore;

const MMP_MAGIC: &[u8; 4] = b"MMP1";
const VAULT_VERSION: u16 = 1;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;

pub struct EncryptionConfig {
    pub shared_password: String,
    pub m_cost: u32,    // 65536
    pub t_cost: u32,    // 3
    pub p_cost: u32,    // 4
}

impl Default for EncryptionConfig {
    fn default() -> Self {
        Self {
            shared_password: String::new(),
            m_cost: 65536,
            t_cost: 3,
            p_cost: 4,
        }
    }
}

pub fn encrypt_vault_to_mmp(
    vault_json: &[u8],
    config: &EncryptionConfig,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut salt = [0u8; SALT_LEN];
    rand::thread_rng().fill_bytes(&mut salt);

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);

    // Argon2id 密钥派生
    let params = Params::new(config.m_cost, config.t_cost, config.p_cost, Some(32))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key_bytes = [0u8; 32];
    argon2.hash_password_into(
        config.shared_password.as_bytes(),
        &salt,
        &mut key_bytes,
    )?;

    // ChaCha20-Poly1305 加密
    let key = Key::from_slice(&key_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let cipher = ChaCha20Poly1305::new(key);
    let ciphertext = cipher.encrypt(nonce, vault_json)?;

    // 构建 .mmp 二进制
    let mut output = Vec::with_capacity(8 + SALT_LEN + NONCE_LEN + ciphertext.len());
    output.extend_from_slice(MMP_MAGIC);
    output.extend_from_slice(&VAULT_VERSION.to_le_bytes());
    output.extend_from_slice(&0u16.to_le_bytes()); // reserved
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(output)
}
```

### 6.5 客户端拉取处理

```rust
// src/handlers/subscription.rs

use axum::{extract::Path, http::StatusCode, Json};
use base64::Engine;

pub async fn get_subscription(
    Path(token): Path<String>,
) -> Result<(StatusCode, String), (StatusCode, Json<serde_json::Value>)> {
    // 1. 查询订阅
    let subscription = db::find_subscription_by_token(&token)
        .map_err(|_| (StatusCode::NOT_FOUND, json_error("subscription not found")))?;

    // 2. 检查过期
    if let Some(expires) = subscription.expires_at {
        if expires < chrono::Utc::now() {
            return Err((StatusCode::GONE, json_error("subscription expired")));
        }
    }

    // 3. 从数据库组装 Vault JSON
    let vault = db::build_vault_from_subscription(subscription.id)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, json_error("build vault failed")))?;

    let vault_json = serde_json::to_vec(&vault)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, json_error("serialize failed")))?;

    // 4. 加密为 .mmp 格式
    let encrypted = crypto::encrypt_vault_to_mmp(&vault_json, &get_crypto_config())
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, json_error("encryption failed")))?;

    // 5. Base64 编码返回
    let encoded = base64::engine::general_purpose::STANDARD.encode(&encrypted);

    Ok((StatusCode::OK, encoded))
}
```

### 6.6 管理接口示例

```rust
// src/handlers/admin.rs

pub async fn create_subscription(
    headers: HeaderMap,
    Json(body): Json<CreateSubscriptionRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    verify_admin(&headers)?;

    let token = generate_token(32);
    let sub = db::insert_subscription(&token, &body.name, body.description.as_deref(), body.expires_at.as_deref())
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, json_error("insert failed")))?;

    Ok((StatusCode::CREATED, Json(serde_json::json!({
        "token": sub.token,
        "url": format!("{}/api/sub/{}", get_base_url(), sub.token),
        "name": sub.name,
        "created_at": sub.created_at,
    }))))
}

pub async fn add_entry(
    headers: HeaderMap,
    Path(token): Path<String>,
    Json(body): Json<CreateEntryRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    verify_admin(&headers)?;

    let subscription = db::find_subscription_by_token(&token)
        .map_err(|_| (StatusCode::NOT_FOUND, json_error("subscription not found")))?;

    let entry = db::insert_entry(subscription.id, &body)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, json_error("insert failed")))?;

    Ok(Json(serde_json::json!({
        "id": entry.id,
        "title": entry.title,
        "created_at": entry.created_at,
    })))
}
```

### 6.7 Token 生成

```rust
fn generate_token(length: usize) -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
    let mut rng = rand::thread_rng();
    (0..length).map(|_| CHARSET[rng.gen_range(0..CHARSET.len())] as char).collect()
}
```

---

## 7. 客户端变更概要

### 7.1 Rust 后端新增

**新依赖：** `reqwest`（HTTP 客户端）

**新模块：** `src-tauri/src/commands/subscription.rs`

| 命令 | 说明 |
|------|------|
| `fetch_subscription_vault(url)` | HTTP GET → base64 解码 → 解密 → 返回 Vault（仅内存） |
| `get_subscription_history()` | 从 config 读取订阅历史 |
| `remove_subscription_history(url)` | 从 config 移除历史记录 |

**新增解密函数：**
```rust
// 从内存中的 .mmp 二进制数据解密（不是从文件）
fn decrypt_vault_from_bytes(data: &[u8], shared_password: &str) -> Result<Vault> {
    // 1. 解析 Header (8B) + Salt (16B) + Nonce (12B) + Ciphertext
    // 2. Argon2id(shared_password, salt) → key
    // 3. ChaCha20-Poly1305::decrypt(key, nonce, ciphertext)
    // 4. JSON → Vault
}
```

**配置扩展：** `AppConfig` 新增字段：
```rust
pub subscription_history: Vec<SubscriptionMeta>,  // 订阅历史

pub struct SubscriptionMeta {
    pub url: String,
    pub name: String,       // vault name
    pub entry_count: u32,
    pub last_accessed: String,
}
```

### 7.2 前端变更

**vaultStore 扩展：**
```typescript
// 新增状态
subscriptionVault: Vault | null          // 当前订阅 vault（仅内存）
subscriptionEntries: Entry[]             // 订阅条目列表
subscriptionSource: string | null        // 当前订阅 URL

// 新增 actions
fetchSubscription(url: string): Promise<void>
clearSubscription(): void
isSubscriptionEntry(entryId: string): boolean
```

**WelcomeScreen 变更：**
- 新增"订阅密码库"操作卡片（类似 Git 仓库卡片）
- 新增订阅历史列表（类似 recent_git_repos）
- 输入框输入订阅 URL → 点击拉取 → 跳转 MainScreen

**MainScreen 变更：**
- EntryList 合并展示本地条目 + 订阅条目
- 订阅条目显示锁定图标标识
- SideNavBar 的分组列表包含订阅 vault 的分组

**EntryDetail 变更：**
- 检测 `isSubscriptionEntry(entryId)`
- 若为订阅条目，点击编辑按钮时显示 toast："订阅信息无法修改"
- 隐藏删除按钮

---

## 8. 部署建议

### 8.1 最小部署

```bash
# 单二进制 + SQLite
./subscription-server --config config.toml
```

### 8.2 Docker 部署

```dockerfile
FROM rust:1.77 AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/subscription-server /usr/local/bin/
COPY config.toml /etc/subscription-server/config.toml
EXPOSE 3000
CMD ["subscription-server", "--config", "/etc/subscription-server/config.toml"]
```

### 8.3 HTTPS

生产环境必须使用 HTTPS。推荐方案：
- Nginx/Caddy 反向代理 + Let's Encrypt
- 或直接在 Axum 中使用 rustls

### 8.4 安全注意事项

- **共享密码**：必须强密码（>= 32 字符），通过环境变量或密钥管理服务注入，不硬编码
- **管理员 Token**：同样通过环境变量配置
- **订阅 Token**：定期轮换，支持过期时间
- **HTTPS**：生产环境必须启用，防止传输中被截获
- **Rate Limiting**：对 `/api/sub/{token}` 做请求频率限制
- **日志**：记录每次拉取的 IP、时间，不记录解密内容
