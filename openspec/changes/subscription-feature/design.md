## Context

mmpassword 是基于 Tauri 2.0 的桌面密码管理器，前端 React + Zustand，后端 Rust。现有加密管线为 Argon2id（密钥派生）+ ChaCha20-Poly1305（对称加密），本地 .mmp 文件存储。已支持本地文件和 Git 仓库两种密码库来源。

本次新增第三种来源：订阅 URL。服务端维护密码数据，客户端通过 HTTP GET 拉取 base64 编码的 .mmp 格式加密数据，使用共享密码在内存中解密展示。详细服务端方案见项目根目录 `server.md`。

## Goals / Non-Goals

**Goals:**
- 客户端通过 HTTP GET 请求订阅 URL，获取 base64 编码的加密数据
- 在内存中解密 .mmp 格式数据（复用现有 crypto 管线），不落盘
- 订阅条目与本地条目合并展示，订阅条目强制只读
- 首页提供订阅 URL 输入和历史快捷访问
- 与现有本地 Vault、Git Vault 流程无冲突

**Non-Goals:**
- 服务端实现（已在 server.md 中独立规划）
- 同时激活多个订阅（仅支持单次拉取查看）
- 订阅数据的离线缓存或持久化
- 订阅自动刷新/定时拉取
- 订阅条目的搜索/过滤（后续迭代）

## Decisions

### D1: 加密密钥方案 — 共享密码字符串 + Argon2id

**选择**: 使用预共享密码字符串，通过 Argon2id 派生密钥，与客户端本地 .mmp 文件使用完全相同的加密管线。

**理由**: 最大程度复用现有 `crypto/kdf.rs` 和 `crypto/cipher.rs` 代码，服务端和客户端只需共享一个密码字符串。.mmp 格式头中已包含 Salt，服务端每次加密使用随机 Salt + Nonce，保证数据新鲜性。

**替代方案**: 使用原始 32 字节密钥直接加解密，跳过 Argon2id。需要新增解密函数，无法复用现有代码。且破坏 .mmp 格式兼容性。

### D2: 内存解密架构 — 新增 decrypt_vault_from_bytes 函数

**选择**: 在 Rust 后端新增 `decrypt_vault_from_bytes(data: &[u8], password: &str) -> Result<Vault>` 函数，直接从内存中的 .mmp 二进制数据解密，不经过文件系统。

**理由**: 现有 `open_vault_file_with_key` 从文件路径读取，订阅数据来源于 HTTP 响应内存。两个函数共享 Argon2id 派生和 ChaCha20 解密逻辑，仅数据来源不同。

**实现**: 从 `storage/vault_file.rs` 中提取解析逻辑：
```
.mmp bytes → 解析 Header(8B) → 提取 Salt(16B) → 提取 Encrypted(nonce+ciphertext)
→ Argon2id(password, salt) → key → ChaCha20::decrypt → JSON → Vault
```

### D3: 订阅状态管理 — 扩展 AppState + vaultStore

**选择**:
- **Rust 侧**: 在 `AppState` 中新增 `subscription_vault: RwLock<Option<Vault>>` 存储当前订阅 Vault
- **前端侧**: 在 `vaultStore` 中新增 `subscriptionVault`, `subscriptionEntries`, `subscriptionSource` 状态

**理由**: 订阅 Vault 独立于本地 Vault Session，避免污染现有 `VaultSession`。AppState 已有 `parking_lot::RwLock` 模式，新增一个 RwLock 风格一致。

**替代方案**: 将订阅数据合并进现有 `VaultSession`。风险：订阅数据可能在 save_vault 时被写入本地文件，违反"不落盘"约束。独立存储更安全。

### D4: 前端条目合并策略 — mergedEntries 计算属性

**选择**: 在 `vaultStore` 中维护 `mergedEntries: Entry[]`，由 `get()` 方法将本地 entries 和 subscriptionEntries 合并返回。订阅条目新增 `source: 'subscription'` 标识字段。

**理由**: MainScreen 和 EntryList 现有逻辑都依赖 `entries` 数组，改为消费 `mergedEntries` 最小化改动。使用 Zustand 的 `get()` 计算属性避免额外渲染。

**替代方案**: 在组件层合并。需要在 EntryList、EntryDetail、SideNavBar 等多处重复合并逻辑，分散且易遗漏。

### D5: 订阅历史存储 — AppConfig 扩展

**选择**: 在 `AppConfig` 中新增 `subscription_history: Vec<SubscriptionMeta>`，与现有 `recent_vaults` 和 `recent_git_repos` 模式一致。

**理由**: 复用现有配置存储管线（config.json），向后兼容（旧配置加载时 missing 字段使用 Default）。

### D6: HTTP 客户端 — reqwest

**选择**: 新增 `reqwest` 依赖用于 HTTP GET 请求。

**理由**: Tauri 应用中 reqwest 是标准 HTTP 客户端选择，支持 async、TLS、超时配置。

## Risks / Trade-offs

- **[共享密码泄露]** → 密码仅存在于客户端二进制和服务端配置中。桌面应用二进制可被逆向，但这与本地 .mmp 文件密码的安全模型一致（安全依赖于加密数据的保密性，而非算法保密性）。生产建议通过环境变量注入。
- **[订阅 URL 泄露]** → URL 即 Token，URL 泄露等同于数据泄露。建议服务端设置过期时间，支持 Token 轮换。
- **[配置向后兼容]** → `AppConfig` 新增字段需实现 `Default`，旧配置文件加载时自动填充空数组。使用 `#[serde(default)]` 处理。
- **[内存中明文密码]** → 订阅 Vault 解密后存在于内存中，与本地 Vault 行为一致。lock 时同时清除。
- **[网络异常]** → reqwest 请求可能超时或失败。需提供明确的错误提示，不阻塞本地 Vault 使用。
