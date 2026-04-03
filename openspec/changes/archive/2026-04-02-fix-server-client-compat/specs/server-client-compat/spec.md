## ADDED Requirements

### Requirement: Vault JSON 与客户端模型兼容

服务端通过 `GET /api/sub/{token}` 返回的加密 Vault JSON，解密后 SHALL 能被客户端 `serde_json::from_str::<Vault>()` 成功反序列化。

#### Scenario: id 字段为合法 UUID

- **WHEN** 服务端构建 VaultJson 返回给客户端
- **THEN** `id` 字段 SHALL 是合法的 UUID v5 字符串（如 `"550e8400-e29b-41d4-a716-446655440000"`），而非整数字符串

#### Scenario: 时间字段为 RFC3339 格式

- **WHEN** 服务端构建 VaultJson 返回给客户端
- **THEN** `created_at` 和 `updated_at` 字段 SHALL 是 RFC3339 格式的时间字符串（如 `"2026-04-02T10:00:00+00:00"`），可被 `chrono::DateTime<Utc>` 反序列化

#### Scenario: Entry 和 Group 内嵌对象时间格式一致

- **WHEN** VaultJson 包含 entries 和 groups 数组
- **THEN** 每个 entry 和 group 的 `created_at`、`updated_at` 字段 SHALL 同样为 RFC3339 格式

### Requirement: 过期订阅返回 410 Gone

服务端 SHALL 对过期订阅返回 HTTP 410 状态码，符合 `server.md` API 规范。

#### Scenario: 客户端访问过期订阅

- **WHEN** 客户端请求 `GET /api/sub/{token}`，且该订阅的 `expires_at` 早于当前时间
- **THEN** 服务端 SHALL 返回 HTTP 410 状态码，body 为 `{"error": "subscription expired"}`

### Requirement: 订阅 URL 可用

管理接口返回的订阅 URL SHALL 是客户端可直接访问的地址，不得包含 `0.0.0.0`。

#### Scenario: 配置了 base_url

- **WHEN** 配置文件中设置了 `base_url = "https://my-server.com"`
- **THEN** 订阅 URL SHALL 为 `https://my-server.com/api/sub/{token}`

#### Scenario: 未配置 base_url

- **WHEN** 未设置 `base_url`，host 为 `0.0.0.0`，port 为 `3000`
- **THEN** 订阅 URL SHALL 回退为 `http://0.0.0.0:3000/api/sub/{token}`（保持向后兼容）

### Requirement: SQLite 外键约束启用

服务端数据库初始化时 SHALL 启用外键约束。

#### Scenario: 删除订阅时级联删除关联记录

- **WHEN** 删除一个订阅
- **THEN** `subscription_entries` 表中对应的关联记录 SHALL 被自动删除
