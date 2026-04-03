## 1. Rust 后端 — 基础设施

- [x] 1.1 在 `Cargo.toml` 中添加 `reqwest` 依赖（features: default-tls）
- [x] 1.2 在 `models/` 中新增 `SubscriptionMeta` 结构体（url, name, entry_count, last_accessed）
- [x] 1.3 在 `storage/config.rs` 的 `AppConfig` 中新增 `subscription_history: Vec<SubscriptionMeta>` 字段（`#[serde(default)]`）
- [x] 1.4 在 `state.rs` 中新增 `subscription_vault: RwLock<Option<Vault>>` 字段到 `AppState`

## 2. Rust 后端 — 解密核心

- [x] 2.1 在 `storage/vault_file.rs` 中新增 `decrypt_vault_from_bytes(data: &[u8], password: &str) -> Result<Vault>` 函数：解析 MMP1 Header → 提取 Salt → 提取 Nonce+Ciphertext → Argon2id 派生密钥 → ChaCha20-Poly1305 解密 → JSON 反序列化为 Vault
- [x] 2.2 定义共享密码常量或配置项（`SUBSCRIPTION_SHARED_PASSWORD`）

## 3. Rust 后端 — IPC 命令

- [x] 3.1 创建 `commands/subscription.rs` 模块，实现 `fetch_subscription_vault(url: String, state: State) -> Result<Vault, String>`：reqwest GET → base64 解码 → `decrypt_vault_from_bytes` → 存入 `state.subscription_vault` → 更新 `config.subscription_history` → 返回 Vault
- [x] 3.2 实现 `get_subscription_vault(state: State) -> Result<Option<Vault>, String>`：从 `state.subscription_vault` 读取当前订阅 Vault
- [x] 3.3 实现 `get_subscription_history(state: State) -> Result<Vec<SubscriptionMeta>, String>`：从 config 读取
- [x] 3.4 实现 `remove_subscription_history(url: String, state: State) -> Result<(), String>`：从 config 移除
- [x] 3.5 实现 `clear_subscription(state: State) -> Result<(), String>`：清空 `state.subscription_vault`
- [x] 3.6 在 `lib.rs` 的 `generate_handler!` 中注册所有新命令

## 4. 前端 — Store 层

- [x] 4.1 在 `vaultStore` 中新增状态：`subscriptionVault`, `subscriptionEntries`, `subscriptionSource`
- [x] 4.2 实现 `fetchSubscription(url)` action：调用 `fetch_subscription_vault` IPC → 更新 subscription 状态
- [x] 4.3 实现 `getSubscriptionHistory()` action：调用 IPC 获取历史
- [x] 4.4 实现 `removeSubscriptionHistory(url)` action：调用 IPC 移除
- [x] 4.5 实现 `clearSubscription()` action：清空订阅相关状态
- [x] 4.6 实现 `isSubscriptionEntry(entryId)` 辅助方法：判断条目是否来自订阅
- [x] 4.7 实现 `mergedEntries` 计算逻辑：合并本地 entries 和 subscriptionEntries，订阅条目标记 source 字段
- [x] 4.8 修改 `lockVault` action：同时调用 `clear_subscription` 清除订阅数据

## 5. 前端 — WelcomeScreen 订阅入口

- [x] 5.1 在 WelcomeScreen 新增"订阅密码库"操作卡片（URL 输入框 + 拉取按钮）
- [x] 5.2 新增订阅历史列表区域（显示 vault name、entry count、last accessed）
- [x] 5.3 历史列表支持点击快捷拉取和删除操作
- [x] 5.4 处理拉取失败错误提示（toast 或 inline error）

## 6. 前端 — MainScreen 条目合并展示

- [x] 6.1 修改 EntryList：消费 `mergedEntries` 而非 `entries`，订阅条目显示锁定图标
- [x] 6.2 修改 SideNavBar：展示订阅 Vault 的分组，与本地分组有视觉区分
- [x] 6.3 修改 MainScreen 的搜索/过滤逻辑：覆盖 mergedEntries
- [x] 6.4 EntryList 右键菜单：订阅条目的"编辑"和"删除"选项点击后显示 toast "订阅信息无法修改"

## 7. 前端 — EntryDetail 只读约束

- [x] 7.1 修改 EntryDetail：订阅条目隐藏编辑按钮，或点击编辑按钮时显示 toast "订阅信息无法修改"
- [x] 7.2 订阅条目详情页保持字段查看和复制功能（与本地条目一致）
- [x] 7.3 订阅条目不显示删除按钮
- [x] 7.4 当订阅分组选中时，"New Entry" 按钮点击显示 toast "订阅信息无法修改"

## 8. 集成测试与收尾

- [x] 8.1 验证完整流程：输入 URL → 拉取 → 查看 → 复制 → 锁定 → 清除
- [x] 8.2 验证本地 Vault 操作不受订阅数据影响（创建/编辑/删除/保存本地条目）
- [x] 8.3 验证配置向后兼容：旧 config.json 加载不报错
- [x] 8.4 验证订阅历史：添加、显示、删除、上限 10 条
- [x] 8.5 验证错误场景：无效 URL、网络错误、无效数据、解密失败
