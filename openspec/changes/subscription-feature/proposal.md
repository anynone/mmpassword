## Why

mmpassword 目前仅支持本地和 Git 仓库的密码库管理。团队场景下需要一种方式让管理员集中维护共享密码，成员通过订阅 URL 拉取查看。这避免了手动分发密码文件的安全风险，也无需每个成员单独配置 Git 同步。

## What Changes

- 新增订阅密码库拉取功能：用户输入订阅 URL，客户端通过 HTTP GET 拉取 base64 编码的 .mmp 格式加密数据，在内存中解密后以只读方式展示
- 订阅条目与本地条目合并展示，订阅条目不可编辑、删除（点击编辑显示提示："订阅信息无法修改"）
- 首页新增订阅 URL 历史记录，支持快捷访问（类似 Git 仓库历史，单次拉取）
- Rust 后端新增 HTTP 请求、内存解密、订阅历史管理等 IPC 命令
- 服务端实现方案已输出到 `server.md`（不在本次实施范围内）

## Capabilities

### New Capabilities
- `subscription-fetch`: 从订阅 URL 拉取、解密、展示远程密码库数据，包含 HTTP 请求、base64 解码、.mmp 格式解密、内存状态管理
- `subscription-ui`: 订阅相关的 UI 变更——首页订阅入口与历史、MainScreen 订阅条目合并展示与只读约束、EntryDetail 编辑拦截

### Modified Capabilities
（无现有 capability 需要修改）

## Impact

- **新增 Rust 依赖**: `reqwest`（HTTP 客户端）
- **Rust 后端**: 新增 `commands/subscription.rs` 模块，`storage/config.rs` 中 `AppConfig` 新增 `subscription_history` 字段
- **前端 Store**: `vaultStore` 新增订阅相关状态和 actions
- **前端组件**: WelcomeScreen（订阅入口+历史）、MainScreen（条目合并）、EntryDetail（只读拦截）、SideNavBar（订阅分组）
- **配置文件**: `config.json` 新增 `subscription_history` 数组，需向后兼容旧配置
- **加密**: 复用现有 `crypto` 模块（Argon2id + ChaCha20-Poly1305），新增 `decrypt_vault_from_bytes` 内存解密函数
