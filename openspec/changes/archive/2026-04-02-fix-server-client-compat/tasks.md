## 1. 错误类型扩展

- [x] 1.1 在 `server/src/error.rs` 的 `AppError` 枚举中新增 `Gone(String)` 变体，映射到 HTTP 410 状态码

## 2. 配置扩展

- [x] 2.1 在 `server/src/config.rs` 的 `Config` 中新增 `base_url: Option<String>` 字段
- [x] 2.2 在 `ServerConfig` 中新增 `base_url` 可选字段，支持配置文件 `[server]` 段
- [x] 2.3 支持环境变量 `MMP_BASE_URL` 覆盖
- [x] 2.4 新增 `Config::get_base_url()` 方法：有配置返回配置值，无配置回退到 `http://{host}:{port}`

## 3. 数据库修复

- [x] 3.1 在 `server/src/db.rs` 的 `init` 函数中添加 `PRAGMA foreign_keys = ON`
- [x] 3.2 修改 `get_subscription_by_token` 中过期订阅返回 `AppError::Gone` 而非 `AppError::BadRequest`

## 4. 模型与序列化修复

- [x] 4.1 在 `server/src/models.rs` 的 `VaultJson` 中将时间字段 `created_at`/`updated_at` 类型从 `String` 改为 `chrono::DateTime<Utc>`
- [x] 4.2 在 `server/src/db.rs` 中新增时间解析辅助函数 `parse_datetime(s: &str) -> DateTime<Utc>`，先尝试 RFC3339 解析，失败则回退 SQLite datetime 格式
- [x] 4.3 修改 `build_vault_for_subscription` 中 `VaultJson.id` 的生成逻辑：使用 `Uuid::new_v5(Uuid::NAMESPACE_URL, token.as_bytes())` 从 token 确定性生成 UUID
- [x] 4.4 修改 `build_vault_for_subscription` 中 VaultJson 的 `created_at`/`updated_at` 使用 `parse_datetime` 解析

## 5. Handler 与路由修复

- [x] 5.1 修改 `server/src/handlers/admin_subscription.rs` 中的 `base_url()` 函数，改为从 `state.config.get_base_url()` 获取
- [x] 5.2 修复 `server/src/main.rs` 中所有路由的路径参数语法：从 `{param}` 改为 `:param`（Axum 0.7/matchit 0.7 要求 `:param` 语法）

## 6. 验证

- [x] 6.1 运行 `cargo build` 确认编译通过
- [x] 6.2 运行 `cargo test` 确认无回归（如有测试）
- [x] 6.3 手动验证：启动服务端，创建订阅 + 条目，通过 `/api/sub/{token}` 拉取，确认返回的 base64 数据格式正确（MMP1 magic, version=1, 905 bytes）
