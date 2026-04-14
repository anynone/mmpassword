# Tasks: TOTP/MFA 验证码功能

| 字段 | 值 |
|------|-----|
| **变更名称** | totp-mfa |
| **总任务数** | 10 (全部完成) |
| **创建日期** | 2026-04-14 |
| **最后更新** | 2026-04-14 |

---

## 任务概览

```
┌──────────────────────────────────────────────────────────────────┐
│                      任务依赖关系图                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: 后端 (T01-T04)                                         │
│  ═════════════════════════                                       │
│    T01 ──► T02 ──► T03 ──► T04                                  │
│                                                                  │
│  Phase 2: 前端 (T05-T08)                                         │
│  ═════════════════════════                                       │
│    T05 ──► T06 ──► T07 ──► T08                                  │
│                                                                  │
│  Phase 3: 集成与国际化 (T09-T10)                                  │
│  ══════════════════════════════                                  │
│    T09 ──► T10                                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 后端

### T01 - 添加 totp-rs 依赖
- **描述**: 在 Cargo.toml 中添加 `totp-rs` crate 依赖
- **层级**: 后端基础设施
- **优先级**: P0
- **预估时间**: 10 分钟
- **验收标准**:
  - [x] `totp-rs = "5"` 添加到 Cargo.toml
  - [x] `cargo build` 编译成功

### T02 - Entry 模型增加 totp_secret 字段
- **描述**: 在 Rust Entry 结构体和 TypeScript Entry 接口中新增 `totp_secret` / `totpSecret` 字段
- **依赖**: T01
- **层级**: 后端 + 前端类型
- **优先级**: P0
- **预估时间**: 20 分钟
- **验收标准**:
  - [x] Rust `Entry` 新增 `totp_secret: Option<String>`，使用 `#[serde(skip_serializing_if, default)]`
  - [x] TypeScript `Entry` 新增 `totpSecret?: string`
  - [x] `Entry::new()` 初始化 `totp_secret: None`
  - [x] 现有单元测试通过（向后兼容）
  - [x] `cargo test` 通过

### T03 - 实现 TOTP 命令模块
- **描述**: 创建 `commands/totp.rs`，实现 `generate_totp`、`set_totp_secret`、`remove_totp_secret` 三个 Tauri 命令
- **依赖**: T02
- **层级**: 后端
- **优先级**: P0
- **预估时间**: 1.5 小时
- **验收标准**:
  - [x] `generate_totp(secret)` 返回 `{ code, remainingSeconds }`
  - [x] 支持 base32 secret 输入
  - [x] 支持 otpauth:// URI 输入（自动提取 secret）
  - [x] 无效 secret 返回明确错误信息
  - [x] `set_totp_secret(id, secret)` 更新 Entry 的 totp_secret 字段
  - [x] `remove_totp_secret(id)` 将 totp_secret 设为 None
  - [x] set/remove 命令遵循 Git Vault Save Pattern
  - [x] 集成到 `lib.rs` 命令注册

### T04 - TOTP 命令单元测试
- **描述**: 为 TOTP 命令编写单元测试，验证验证码生成正确性和边界情况
- **依赖**: T03
- **层级**: 测试
- **优先级**: P0
- **预估时间**: 45 分钟
- **验收标准**:
  - [x] 测试 base32 secret 解析正确性
  - [x] 测试 otpauth URI 解析（标准格式、缺少 secret、错误格式）
  - [x] 测试 TOTP 码生成与已知值一致（RFC 6238 test vectors）
  - [x] 测试 remaining_seconds 计算正确性
  - [x] 测试无效输入的错误处理

---

## Phase 2: 前端

### T05 - TotpCountdown SVG 倒计时组件
- **描述**: 创建 SVG 圆形倒计时组件，用于 TOTP 卡片中显示剩余时间
- **依赖**: 无
- **层级**: 前端组件
- **优先级**: P0
- **预估时间**: 1 小时
- **验收标准**:
  - [x] SVG 圆环随 remaining 值平滑动画
  - [x] 颜色随时间变化：>10s 主色、5-10s 黄色、<5s 红色
  - [x] 中间显示剩余秒数
  - [x] 支持 dark/light 主题

### T06 - TotpCard 展示卡片组件
- **描述**: 创建 TOTP 验证码展示卡片，包含验证码显示、倒计时、复制和编辑按钮
- **依赖**: T05
- **层级**: 前端组件
- **优先级**: P0
- **预估时间**: 1.5 小时
- **验收标准**:
  - [x] entry.totpSecret 存在时显示验证码 + 倒计时
  - [x] entry.totpSecret 不存在时显示 "Add MFA" 按钮
  - [x] 点击验证码复制到剪贴板 + toast 提示
  - [x] 验证码每 30 秒自动刷新（通过 setTimeout 调度）
  - [x] 组件 unmount 时清理定时器
  - [x] 显示 Edit 和 Remove 按钮

### T07 - TotpSetupDialog 编辑弹窗组件
- **描述**: 创建 MFA 设置弹窗，支持选择输入类型、粘贴内容、实时预览
- **依赖**: T05
- **层级**: 前端组件
- **优先级**: P0
- **预估时间**: 1.5 小时
- **验收标准**:
  - [x] 支持 Secret Key 和 otpauth URI 两种输入类型切换
  - [x] 输入内容变化后 debounce 300ms 调用 generate_totp 预览
  - [x] 预览成功显示验证码，预览失败显示错误
  - [x] Save 按钮仅在验证有效时可用
  - [x] 保存成功后关闭弹窗，刷新 Entry 显示
  - [x] 使用 shadcn Dialog 组件

### T08 - EntryDetail 集成 TotpCard
- **描述**: 在 EntryDetail 组件中集成 TotpCard，将其放置在字段列表上方
- **依赖**: T06, T07
- **层级**: 前端集成
- **优先级**: P0
- **预估时间**: 30 分钟
- **验收标准**:
  - [x] TotpCard 在字段列表上方显示
  - [x] 仅在 WebsiteLogin 类型的条目中显示（SecureNote 不显示）
  - [x] 编辑模式下隐藏 TotpCard
  - [x] 条目切换时 TotpCard 正确更新

---

## Phase 3: 集成与国际化

### T09 - 添加国际化翻译
- **描述**: 为所有 TOTP 相关 UI 文本添加中英文翻译
- **依赖**: T06, T07
- **层级**: 前端
- **优先级**: P1
- **预估时间**: 20 分钟
- **验收标准**:
  - [x] 所有 TOTP 组件中的文本使用 i18n key
  - [x] 中英文翻译完整（参见 design.md 翻译键列表）
  - [x] 切换语言后所有文本正确显示

### T10 - 端到端验证
- **描述**: 完整验证 TOTP 功能的端到端流程
- **依赖**: T08, T09
- **层级**: 测试
- **优先级**: P0
- **预估时间**: 1 小时
- **验收标准**:
  - [x] 可以添加 TOTP 密钥（base32 secret）
  - [x] 可以添加 TOTP 密钥（otpauth URI）
  - [x] 生成的验证码与 Google Authenticator 一致
  - [x] 验证码每 30 秒自动刷新
  - [x] 点击验证码可复制
  - [x] 可以编辑 TOTP 密钥
  - [x] 可以移除 TOTP 密钥
  - [x] 旧 .mmp 文件（无 totp_secret）可正常打开
  - [x] Git 同步场景下 TOTP 密钥正确保存和恢复
  - [x] 锁定 vault 后 TOTP 定时器停止

---

## 任务统计

| 阶段 | 任务数 | 预估时间 |
|------|--------|----------|
| Phase 1: 后端 | 4 | 2.5 小时 |
| Phase 2: 前端 | 4 | 4.5 小时 |
| Phase 3: 集成测试 | 2 | 1.5 小时 |
| **总计** | **10** | **8.5 小时** |

---

**文档版本**: 1.0
**最后更新**: 2026-04-14
