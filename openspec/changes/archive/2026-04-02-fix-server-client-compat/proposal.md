## Why

服务端 (`server/`) 生成的加密 Vault JSON 与客户端 (`src-tauri/`) 的 `Vault` 模型存在多处数据类型不兼容，导致客户端无法反序列化订阅数据。同时存在过期状态码错误、base_url 不可用、外键约束未启用等问题。这些问题使得订阅功能完全不可用，必须在上线前修复。

## What Changes

- **修复 VaultJson.id 类型**：从整数字符串（如 `"1"`）改为合法 UUID，与客户端 `Vault.id: Uuid` 兼容
- **统一时间格式**：所有时间字段使用 RFC3339 格式（`chrono::DateTime<Utc>`），确保客户端能正确反序列化
- **修复 base_url 生成逻辑**：新增 `base_url` 配置项，替代从 host/port 拼接（避免 `http://0.0.0.0:3000`）
- **修复过期状态码**：过期订阅返回 `410 Gone` 而非 `400 Bad Request`
- **新增 AppError::Gone 变体**：支持 410 状态码
- **启用 SQLite 外键约束**：添加 `PRAGMA foreign_keys = ON`
- **FieldType 类型安全**：确保服务端存储的 field_type 值与客户端枚举 camelCase 格式一致

## Capabilities

### New Capabilities

_(无新增功能，本次为兼容性修复)_

### Modified Capabilities

_(无现有 spec 需要修改，这是纯实现层面的 bug 修复)_

## Impact

- **server/src/models.rs** — VaultJson 结构体字段类型变更，Entry/Field 时间和类型字段调整
- **server/src/db.rs** — `build_vault_for_subscription` 生成 UUID id；`init` 启用外键；时间格式统一
- **server/src/error.rs** — 新增 `Gone` 变体
- **server/src/config.rs** — 新增 `base_url` 配置项
- **server/src/handlers/admin_subscription.rs** — 使用配置的 base_url
- **server/src/handlers/subscription.rs** — 过期检查逻辑调整（已在 db 层处理）
- **无 API 签名变更**，仅修复返回数据的格式与状态码
