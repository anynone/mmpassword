## Context

mmpassword 客户端已实现订阅拉取功能（从 URL 获取 base64 编码的 .mmp 加密数据，在内存中解密，只读展示）。当前缺少服务端来托管和分发密码库数据。

客户端加密管道：Argon2id（m_cost=65536, t_cost=3, p_cost=4）→ ChaCha20-Poly1305 AEAD。.mmp 二进制格式：Header(8B) + Salt(16B) + Nonce(12B) + Ciphertext+Tag。共享密码用于订阅场景的加解密。

客户端 Vault JSON 结构使用 camelCase 序列化，包含 id, name, version, groups, entries, trash, createdAt, updatedAt 等字段。Entry 包含 id, title, entryType(websiteLogin/secureNote), groupId, fields[], tags[], favorite, icon, createdAt, updatedAt。Field 包含 name, value, fieldType(text/password/url/email/notes/username), protected。

## Goals / Non-Goals

**Goals:**
- 提供独立部署的订阅服务器，单二进制 + SQLite
- 管理员通过 Web 后台管理条目、分组、订阅链接
- 客户端通过订阅 URL 拉取加密的密码库数据
- 支持选择性分享：每个订阅可自定义包含哪些条目
- 加密输出与客户端完全兼容

**Non-Goals:**
- 用户认证系统（后续迭代）
- 多租户隔离
- WebSocket 实时推送
- 客户端自动更新机制
- 审计日志

## Decisions

### D1: 全局条目模型 vs 订阅专属条目

**选择**: 全局条目 + 订阅选择性分享（junction table）

**替代方案**: server.md 中的每订阅独立条目模型（subscription_entries 表有 subscription_id 外键）

**理由**: 管理员维护一套密码条目，通过不同订阅链接选择性分享给不同团队。避免数据重复，修改一处所有订阅自动生效。

### D2: 数据库 — SQLite

**选择**: rusqlite（bundled 模式）

**替代方案**: PostgreSQL, MySQL

**理由**: 单二进制部署，零外部依赖。密码管理服务器通常是小规模使用（几十到几百条目），SQLite 完全够用。

### D3: Web 前端嵌入方式 — rust-embed

**选择**: `rust-embed` crate 将前端产物编译进二进制

**替代方案**: 运行时读取静态文件目录

**理由**: 真正的单文件部署。编译时嵌入，运行时零 IO 开销。开发阶段用 Vite dev server + CORS。

### D4: 前端技术栈 — React + Tailwind

**选择**: 与客户端保持一致的技术栈

**理由**: 减少认知负担，共享开发经验。Tailwind 使用 Material Design 3 色彩系统。

### D5: 条目分配 API — PUT 全量替换

**选择**: `PUT /api/admin/subscriptions/{token}/entries` 传入完整 entry_ids 列表

**替代方案**: 逐条 POST/DELETE 操作

**理由**: 简化前端交互逻辑（复选框全选后一次性提交），避免部分失败的一致性问题。

### D6: 分组删除策略 — 级联 null

**选择**: 删除分组时，关联 entries 的 group_id 设为 NULL

**替代方案**: 禁止删除有引用的分组

**理由**: 管理员可能需要重组分组结构。条目变为"未分组"不影响数据完整性。

### D7: 加密参数与客户端对齐

**选择**: 使用与客户端完全相同的 Argon2id 参数和 .mmp 二进制格式

**参数**: m_cost=65536, t_cost=3, p_cost=4, output_len=32, Argon2 version 0x13, ChaCha20-Poly1305 AEAD, Salt=16B, Nonce=12B

**共享密码**: 通过环境变量 `MMP_SUBSCRIPTION_PASSWORD` 或 config.toml 配置，默认值与客户端 `vault_file.rs` 中的常量一致。

## Risks / Trade-offs

**[共享密码安全]** → 共享密码硬编码在客户端二进制中（可通过环境变量覆盖）。服务端必须通过环境变量或配置文件注入强密码，生产环境必须 HTTPS。

**[Argon2id 性能开销]** → 每次客户端拉取都重新加密（随机 salt + nonce）。m_cost=65536 意味着每次加密消耗 64MB 内存。对于低并发场景可接受，高并发时考虑缓存或降低参数。→ 缓解：服务端可配置是否缓存加密结果（TTL 机制），后续迭代考虑。

**[无认证的管理接口]** → 任何能访问服务端口的人都能管理条目。→ 缓解：部署时通过防火墙/VPN 限制管理端口访问，或反向代理层添加 Basic Auth。后续迭代添加认证系统。

**[SQLite 并发写入]** → SQLite 在高并发写入时可能锁冲突。→ 缓解：密码管理服务器通常是低写入频率（管理员偶尔修改条目），不构成问题。启用 WAL 模式提升并发读性能。
