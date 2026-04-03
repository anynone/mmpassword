## Why

mmpassword 客户端已实现订阅拉取功能（从 URL 获取 base64 编码的 .mmp 加密数据），但缺少服务端来托管和分发密码库数据。需要一个独立的订阅服务器，让管理员维护密码条目并通过订阅链接选择性分享给团队成员。

## What Changes

- 新建 `server/` 目录，创建独立的 Rust Axum 服务端项目
- 实现全局 Entry CRUD（新增、编辑、删除、查询），字段支持动态添加/删除（name + value + fieldType）
- 实现全局 Group CRUD（新增、编辑名称、删除），删除时 entries 的 group_id 级联为 null
- 实现订阅链接管理（创建、查看、删除、刷新 token），支持通过 PUT 一次性设置订阅包含的 entry_ids
- 实现 GET /api/sub/{token} 客户端拉取接口，返回 base64(.mmp) 格式加密数据
- 加密流程与客户端完全一致：Argon2id 密钥派生 + ChaCha20-Poly1305 AEAD 加密
- 新增 Web 管理后台（React + Tailwind SPA），包含条目管理、分组管理、订阅管理三个页面
- 前端通过 rust-embed 打包进二进制，单文件部署

## Capabilities

### New Capabilities
- `server-api`: 服务端 REST API（Axum + SQLite），包含 Entry CRUD、Group CRUD、Subscription 管理、客户端拉取接口
- `server-crypto`: 服务端加密模块，与客户端完全兼容的 Argon2id + ChaCha20-Poly1305 加密管道
- `server-web-admin`: Web 管理后台 SPA（React + Tailwind），条目/分组/订阅管理页面，通过 rust-embed 嵌入二进制

### Modified Capabilities
（无，服务端为全新独立项目）

## Impact

- **新增目录**: `server/` — 完整的独立 Rust 项目，与客户端 `src-tauri/` 平级
- **新增依赖**: Axum, rusqlite, argon2, chacha20poly1305, rust-embed, serde, uuid, chrono, tower-http 等
- **API 接口**: /api/admin/entries, /api/admin/groups, /api/admin/subscriptions, /api/sub/{token}
- **数据库**: SQLite 文件存储，包含 entries, groups, subscriptions, subscription_entries 四张表
- **加密兼容**: 使用与客户端相同的共享密码和加密参数
- **部署**: 单二进制 + config.toml，生产环境建议反向代理 HTTPS
