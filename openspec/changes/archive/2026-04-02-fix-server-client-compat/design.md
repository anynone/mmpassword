## Context

mmpassword 服务端 (`server/`) 使用 Axum + SQLite 为客户端提供订阅密码库推送功能。客户端 (`src-tauri/`) 通过 HTTP GET 拉取 base64 编码的 `.mmp` 加密数据，解密后反序列化为 `Vault` 结构体。

当前服务端虽然编译通过，但生成的 Vault JSON 与客户端模型存在多处类型不兼容，导致反序列化必然失败。具体来说：
- 客户端 `Vault.id` 是 `Uuid`，服务端输出整数字符串
- 客户端时间字段是 `DateTime<Utc>`，服务端混用 SQLite datetime 和 RFC3339 字符串
- 过期状态码不符合 API 规范

## Goals / Non-Goals

**Goals:**
- 确保服务端生成的 Vault JSON 能被客户端正确反序列化
- 修复 API 状态码符合 `server.md` 规范
- 修复 base_url 生成逻辑，使订阅 URL 可用
- 启用 SQLite 外键约束，确保数据完整性

**Non-Goals:**
- 不重构服务端架构（保持 Mutex<Connection> 方案）
- 不新增功能，仅修复兼容性
- 不添加管理前端（web/ 部分不在此次范围）
- 不添加测试（可作为后续 change）

## Decisions

### 1. VaultJson.id 生成方式

**决策**：使用 `Uuid::new_v5(NAMESPACE_URL, subscription_token)` 从订阅 token 确定性地生成 UUID。

**替代方案**：
- A. 数据库 `subscriptions` 表主键改为 UUID → 改动过大，影响所有关联查询
- B. 新增 `uuid` 列存储 → 需要迁移，且订阅的 UUID 只在加密输出时需要
- C. `Uuid::new_v5` 确定性生成 → 无需改库，同一 token 始终生成相同 UUID，幂等

选择 C，改动最小，语义合理。

### 2. 时间格式统一

**决策**：服务端 `VaultJson` 的时间字段类型改为 `chrono::DateTime<Utc>`，序列化时自动输出 RFC3339 格式。DB 层 `now_rfc3339()` 已经返回 RFC3339 格式字符串，只需确保 VaultJson 构建时正确解析。

对于从 SQLite 读取的时间字符串，使用 `chrono::DateTime::parse_from_rfc3339()` 解析，解析失败时回退到 `NaiveDateTime::parse_from_str()` + UTC。

### 3. base_url 配置

**决策**：在 `Config` 中新增 `base_url: Option<String>` 字段，支持配置文件 `[server]` 段的 `base_url` 字段和环境变量 `MMP_BASE_URL`。未配置时回退到 `http://{host}:{port}`。

### 4. 过期状态码

**决策**：在 `AppError` 枚举中新增 `Gone(String)` 变体，映射到 HTTP 410。`db::get_subscription_by_token` 中过期检查返回 `AppError::Gone`。

### 5. 外键约束

**决策**：在 `db::init` 中的 `PRAGMA journal_mode=WAL` 之后添加 `PRAGMA foreign_keys = ON`。

### 6. FieldType 兼容性

**决策**：服务端 `models.rs` 中的 `Field.field_type` 保持 `String` 类型（管理端需要灵活性），但在 `build_vault_for_subscription` 中不做额外处理——只要管理端输入的值符合客户端枚举的 camelCase 格式（`text`, `password`, `url`, `email`, `notes`, `username`）即可正常工作。在管理 API 文档中注明有效值。

## Risks / Trade-offs

- **[风险] Uuid::new_v5 生成的 ID 与客户端本地 Vault 的 Uuid::new_v4 不同命名空间** → 无影响，订阅 vault 和本地 vault 是独立的，不会交叉引用
- **[风险] 旧数据库中可能存在非 RFC3339 格式的时间字符串** → 使用回退解析策略，先 RFC3339 后 SQLite 格式
- **[风险] 启用外键约束后现有数据可能有违规行** → 外键约束只对新操作生效，不检查历史数据
