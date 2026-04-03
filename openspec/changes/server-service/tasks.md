## 1. Rust 服务端 — 项目骨架与基础设施

- [x] 1.1 创建 `server/` 目录，初始化 Cargo.toml，添加所有依赖（axum, tokio, serde, serde_json, uuid, chrono, rusqlite, argon2, chacha20poly1305, base64, rand, tower-http, rust-embed, toml）
- [x] 1.2 创建 `server/src/main.rs`：Axum 服务启动入口，加载配置、初始化数据库、注册路由、serve 静态文件
- [x] 1.3 创建 `server/src/config.rs`：配置加载（shared_password, admin_token, host, port, database path），优先级：env > config.toml > 默认值
- [x] 1.4 创建 `server/src/error.rs`：统一错误类型 AppError，实现 IntoResponse trait，返回 JSON 错误响应
- [x] 1.5 创建 `server/src/models.rs`：数据模型定义（Entry, Group, Field, Subscription, SubscriptionWithEntries, VaultJson 等），serde camelCase 序列化
- [x] 1.6 创建 `server/src/middleware/auth.rs`：Bearer Token 验证中间件，从 config 读取 admin_token 进行校验
- [x] 1.7 创建 `server/config.toml` 配置文件模板

## 2. Rust 服务端 — 数据库层

- [x] 2.1 创建 `server/src/db.rs`：SQLite 连接初始化，启用 WAL 模式，执行建表 DDL（entries, groups, subscriptions, subscription_entries）
- [x] 2.2 实现 Entry CRUD 数据库操作：insert_entry, get_all_entries, get_entry_by_id, update_entry, delete_entry（同时清理 subscription_entries 关联）
- [x] 2.3 实现 Group CRUD 数据库操作：insert_group, get_all_groups, update_group, delete_group（级联设置 entries.group_id = NULL）
- [x] 2.4 实现 Subscription CRUD 数据库操作：insert_subscription, get_all_subscriptions, get_subscription_by_token, update_subscription, delete_subscription, refresh_token
- [x] 2.5 实现 Subscription Entries 操作：set_subscription_entries（全量替换）, get_subscription_entries
- [x] 2.6 实现 build_vault_for_subscription：根据 token 查询订阅，获取关联 entry_ids，查询 entries 和去重的 groups，构建 VaultJson 对象

## 3. Rust 服务端 — 加密模块

- [x] 3.1 创建 `server/src/crypto.rs`：实现 encrypt_vault_to_mmp 函数，Argon2id 密钥派生 + ChaCha20-Poly1305 AEAD 加密 + MMP1 二进制格式构建 + Base64 编码
- [x] 3.2 验证加密兼容性：确保生成的 .mmp 格式与客户端 decrypt_vault_from_bytes 兼容（字段序列化 camelCase、加密参数一致）

## 4. Rust 服务端 — API Handlers

- [x] 4.1 创建 `server/src/handlers/mod.rs`：模块导出
- [x] 4.2 创建 `server/src/handlers/admin_entry.rs`：Entry CRUD handlers（create_entry, list_entries, get_entry, update_entry, delete_entry）
- [x] 4.3 创建 `server/src/handlers/admin_group.rs`：Group CRUD handlers（create_group, list_groups, update_group, delete_group）
- [x] 4.4 创建 `server/src/handlers/admin_subscription.rs`：Subscription CRUD handlers + entry assignment（create, list, get, update, delete, refresh, set_entries, get_entries）
- [x] 4.5 创建 `server/src/handlers/subscription.rs`：客户端拉取 handler（get_subscription → 查询 → build_vault → encrypt → base64 → 返回）
- [x] 4.6 在 main.rs 中注册所有路由：/api/admin/* 需要 auth 中间件，/api/sub/* 无需认证

## 5. 前端 — 项目骨架

- [x] 5.1 在 `server/web/` 目录初始化 Vite + React + TypeScript 项目
- [x] 5.2 配置 Tailwind CSS，使用 Material Design 3 色彩系统（参考客户端 tailwind.config.js）
- [x] 5.3 配置 Vite 开发代理：dev 时 `/api` 请求代理到 Axum 后端（port 3000）
- [x] 5.4 安装 Material Symbols 图标字体
- [x] 5.5 创建 `server/web/src/App.tsx`：Layout 组件（侧边栏 + 主内容区）和页面路由（Entries, Groups, Subscriptions）

## 6. 前端 — API 调用层

- [x] 6.1 创建 `server/web/src/api/client.ts`：API 基础封装（fetch wrapper，统一错误处理，Bearer Token header）
- [x] 6.2 创建 `server/web/src/api/entries.ts`：Entry CRUD API 调用函数
- [x] 6.3 创建 `server/web/src/api/groups.ts`：Group CRUD API 调用函数
- [x] 6.4 创建 `server/web/src/api/subscriptions.ts`：Subscription CRUD + entry assignment API 调用函数

## 7. 前端 — Entries 页面

- [x] 7.1 创建 `server/web/src/pages/EntriesPage.tsx`：条目列表页面，表格展示（标题、分组、标签、操作按钮），搜索过滤
- [x] 7.2 创建 `server/web/src/components/EntryForm.tsx`：条目新增/编辑表单弹窗，包含标题、分组选择、字段编辑器（动态添加/删除）、标签、收藏开关、图标选择
- [x] 7.3 创建 `server/web/src/components/FieldEditor.tsx`：动态字段编辑器组件，支持添加/删除/修改字段行（name + value + fieldType 下拉）

## 8. 前端 — Groups 页面

- [x] 8.1 创建 `server/web/src/pages/GroupsPage.tsx`：分组列表页面，卡片展示（名称、图标、条目数量、操作按钮）
- [x] 8.2 创建 `server/web/src/components/GroupForm.tsx`：分组新增/编辑表单弹窗，包含名称输入和图标选择器

## 9. 前端 — Subscriptions 页面

- [x] 9.1 创建 `server/web/src/pages/SubscriptionsPage.tsx`：订阅列表页面（名称、URL 可复制、过期时间、条目数、操作按钮）
- [x] 9.2 创建 `server/web/src/components/SubscriptionForm.tsx`：订阅创建/编辑表单（名称、描述、过期时间）
- [x] 9.3 创建 `server/web/src/components/EntrySelector.tsx`：条目选择器组件，复选框列表显示所有条目（标题 + 分组名），全选/全不选，保存时 PUT entry_ids

## 10. 前端 — 共享组件

- [x] 10.1 创建 `server/web/src/components/IconPicker.tsx`：Material Symbols 图标选择器组件，网格展示常用图标，点击选择
- [x] 10.2 创建 `server/web/src/components/ConfirmDialog.tsx`：确认对话框组件（删除确认等场景）
- [x] 10.3 创建 `server/web/src/components/Toast.tsx`：Toast 提示组件（操作成功/失败反馈）

## 11. 集成与构建

- [x] 11.1 创建 `server/src/static_files.rs`：使用 rust-embed 嵌入 web/dist 目录，实现 fallback 到 index.html 的 SPA 路由
- [x] 11.2 配置 Cargo build script 或手动脚本：先 build 前端（npm run build）再 build Rust（自动嵌入 dist）
- [x] 11.3 创建 `server/build.sh` 构建脚本：一键构建前端 + 后端
- [ ] 11.4 验证完整流程：启动服务 → Web 管理后台创建分组和条目 → 创建订阅并分配条目 → 用客户端 URL 拉取验证解密
