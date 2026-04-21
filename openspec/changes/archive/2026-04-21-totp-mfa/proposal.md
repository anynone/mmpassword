# Proposal: TOTP/MFA 验证码功能

| 字段 | 值 |
|------|-----|
| **变更名称** | totp-mfa |
| **状态** | proposed |
| **创建日期** | 2026-04-14 |
| **技术栈** | Rust (totp-rs) + Tauri 2.0 IPC + React + TypeScript + Tailwind CSS |
| **关联变更** | ui-refactor-shadcn (MFA 组件使用当前 shadcn 组件风格) |

---

## 概述

为 mmpassword 密码管理器添加 TOTP（Time-based One-Time Password）两步验证码功能，使用户可以在密码条目中存储 MFA 密钥，并实时生成 6 位验证码，无需额外安装验证器应用。

## 目标

1. **安全的 TOTP 密钥存储** — MFA 密钥作为 Entry 独立字段存储，享受与密码相同的 ChaCha20-Poly1305 加密保护
2. **实时验证码生成** — Rust 后端计算 TOTP 码，密钥不暴露给前端
3. **直观的用户体验** — 带倒计时动画的验证码显示，一键复制
4. **灵活的输入方式** — 支持粘贴 `otpauth://` URI 和纯 base32 secret

## 范围

### 包含功能

| 模块 | 功能 |
|------|------|
| **数据模型** | Entry 新增 `totp_secret: Option<String>` 字段（Rust + TS） |
| **后端 TOTP** | 基于 `totp-rs` crate 生成验证码，解析 otpauth URI |
| **Tauri 命令** | `generate_totp`、`set_totp_secret`、`remove_totp_secret` |
| **UI 展示** | Entry 详情中的 TOTP 卡片：6 位码 + 圆形倒计时 + 复制 |
| **UI 编辑** | MFA 编辑弹窗：选择输入类型 + 粘贴内容 + 实时预览 |
| **国际化** | 中英文翻译支持 |
| **向后兼容** | 旧 .mmp 文件自动加载，`totp_secret` 默认为 None |

### 不包含

- QR 码扫描（桌面端不常用，延后到后续版本）
- 非标准 TOTP 配置（自定义步长、位数、SHA-256/512，仅支持标准 6 位 30 秒）
- Steam Guard 等专有格式
- HOTP 支持（基于计数器的一次性密码）
- 条目列表中的 TOTP 快速预览

## 技术决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 密钥存储位置 | Entry 独立字段 `totp_secret` | 语义清晰，与 Field 系统分离，便于独立管理 |
| TOTP 生成位置 | Rust 后端 | 密钥不暴露给前端，安全性更高 |
| TOTP 库 | `totp-rs` crate | Rust 生态中最成熟的 TOTP 库，支持 RFC 6238 |
| 存储格式 | 纯 base32 secret | 统一格式；otpauth URI 在后端解析后只存 secret |
| 轮询策略 | 前端按需请求 | 组件挂载时请求，按 remaining 秒数调度下次请求 |
| UI 位置 | Entry 详情字段区上方独立卡片 | 验证码是高频使用功能，需要醒目位置 |

## 数据模型变更

### Rust Entry 新增字段

```rust
// models/entry.rs
pub struct Entry {
    // ... 现有字段 ...
    /// TOTP secret key (base32 encoded)
    /// None = 未设置 MFA
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub totp_secret: Option<String>,
}
```

### TypeScript Entry 新增字段

```typescript
// types/entry.ts
export interface Entry {
  // ... 现有字段 ...
  /** TOTP secret key (base32 encoded), undefined = no MFA */
  totpSecret?: string;
}
```

### 向后兼容

```
旧 .mmp 文件 (无 totp_secret)
    ↓ serde 反序列化
Entry { totp_secret: None, ... }     ← default = None
    ↓ JSON 返回前端
{ ..., "totpSecret": null }          ← skip_serializing_if = none
    ↓ 前端检查
entry.totpSecret ? 显示验证码 : 显示 "Add MFA" 按钮
```

## 后端新增命令

### 1. generate_totp

```rust
/// 根据 base32 secret 生成当前 TOTP 验证码
#[tauri::command]
pub fn generate_totp(secret: String) -> Result<TotpCode, String>

// 返回结构
pub struct TotpCode {
    pub code: String,           // "482031" (6位)
    pub remaining_seconds: u32, // 当前周期剩余秒数 (0-30)
}
```

### 2. set_totp_secret

```rust
/// 为指定条目设置 TOTP 密钥
/// 支持 base32 secret 或 otpauth:// URI
#[tauri::command]
pub async fn set_totp_secret(
    id: String,
    secret: String,       // base32 secret 或 otpauth:// URI
    state: State<'_, AppState>,
) -> Result<Entry, String>
```

### 3. remove_totp_secret

```rust
/// 移除指定条目的 TOTP 密钥
#[tauri::command]
pub async fn remove_totp_secret(
    id: String,
    state: State<'_, AppState>,
) -> Result<Entry, String>
```

### otpauth:// URI 解析逻辑

```
otpauth://totp/Label?secret=BASE32&issuer=X&algorithm=SHA1&digits=6&period=30
                                ↑
                          提取 secret 字段
                          忽略其他参数（仅支持标准配置）
                          如果 secret 缺失或无效 → 返回错误
```

## UI 设计

### 查看模式 — TOTP 卡片

位于 EntryDetail 字段列表上方，作为独立区域显示：

```
┌──────────────────────────────────────────────────────────┐
│  🔑 GitHub Account                      [Edit Entry]     │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  ┌─ Verification Code ───────────────────────────────┐   │
│  │                                                    │   │
│  │   ╭───╮                                            │   │
│  │   │⏱ │   482 031                    [Edit MFA]    │   │
│  │   ╰───╯    ↑ 6位验证码（点击复制）                 │   │
│  │        ↑ 圆形倒计时 (SVG)                          │   │
│  │                                                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                          │
│  未设置 MFA 时显示：                                     │
│  ┌─ Two-Factor Authentication ───────────────────────┐   │
│  │   🔐  [+ Add MFA Verification]                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                          │
│  Username    john.doe                      [Copy]        │
│  Password    ••••••••••                    [Copy] [Show]  │
│  Website     https://github.com            [Copy]        │
└──────────────────────────────────────────────────────────┘
```

### 圆形倒计时组件 (TotpCountdown)

```
SVG 圆环动画：
- 外圈：30秒周期，随时间递减
- 颜色：>10s 绿色，5-10s 黄色，<5s 红色
- 动画：CSS transition 平滑过渡
- 尺寸：32×32px

     ╭────╮       ╭────╮       ╭────╮
     │ ██ │ 25s   │ █  │ 10s   │    │ 3s
     │    │       │    │       │    │
     ╰────╯       ╰────╯       ╰────╯
      绿色          黄色          红色
```

### MFA 编辑弹窗 (TotpSetupDialog)

```
┌─────────────────────────────────────────────┐
│  Set Up MFA Verification                    │
│  ─────────────────────────────────────────  │
│                                             │
│  Input Type:                                │
│  ┌─────────────────┐ ┌─────────────────┐   │
│  │ ● Secret Key    │ │ ○ otpauth URI   │   │
│  └─────────────────┘ └─────────────────┘   │
│                                             │
│  Secret Key (base32):                       │
│  ┌─────────────────────────────────────┐    │
│  │  JBSWY3DPEHPK3PXP                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌── Preview ─────────────────────────┐    │
│  │  Verification Code: 482 031        │    │
│  │  Valid for: 25s                    │    │
│  └────────────────────────────────────┘    │
│                                             │
│                     [Cancel]    [Save]      │
└─────────────────────────────────────────────┘
```

弹窗行为：
1. 用户选择输入类型（Secret Key 或 otpauth URI）
2. 粘贴内容到文本框
3. 实时调用 `generate_totp` 预览验证码
4. 点击 Save → 调用 `set_totp_secret` 保存到 Entry

## 前端轮询机制

```
TotpCard 组件生命周期：

mount
  │
  ├── entry.totpSecret 存在？
  │     ├── Yes → invoke("generate_totp", { secret })
  │     │         │
  │     │         ├── 成功 → 显示 code + remaining
  │     │         │          │
  │     │         │          └── setTimeout(remaining * 1000, 重新请求)
  │     │         │                ↑ 循环直到 unmount
  │     │         │
  │     │         └── 失败 → 显示错误提示
  │     │
  │     └── No → 显示 "Add MFA" 按钮
  │
unmount
  │
  └── clearTimeout() ← 清理定时器
```

优化点：
- 同一时刻只有一个 TOTP 定时器运行（当前选中条目）
- 切换条目时自动清理前一个定时器
- 锁定 vault 时停止所有定时器

## 文件变更清单

### Rust 后端

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src-tauri/Cargo.toml` | 修改 | 新增 `totp-rs` 依赖 |
| `src-tauri/src/models/entry.rs` | 修改 | Entry 新增 `totp_secret` 字段 |
| `src-tauri/src/commands/totp.rs` | 新建 | TOTP 相关命令 |
| `src-tauri/src/commands/mod.rs` | 修改 | 注册 totp 模块 |
| `src-tauri/src/lib.rs` | 修改 | 注册 Tauri 命令 |
| `src-tauri/src/models/vault.rs` | 修改 | update_entry 支持 totp_secret |

### TypeScript 前端

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/types/entry.ts` | 修改 | Entry 新增 `totpSecret` 字段 |
| `src/components/entry/TotpCard.tsx` | 新建 | TOTP 展示卡片（含倒计时） |
| `src/components/entry/TotpSetupDialog.tsx` | 新建 | MFA 设置弹窗 |
| `src/components/entry/TotpCountdown.tsx` | 新建 | SVG 圆形倒计时组件 |
| `src/components/layout/EntryDetail.tsx` | 修改 | 集成 TotpCard |
| `src/stores/vaultStore.ts` | 修改 | 新增 TOTP 相关操作 |
| `src/i18n/translations.ts` | 修改 | 新增 MFA 相关翻译 |

## 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| TOTP 密钥泄露 | 高 | 密钥存储在加密的 .mmp 文件中，不解密无法获取 |
| 向后兼容性问题 | 中 | `totp_secret` 使用 `Option<String>` + serde default，旧文件自动兼容 |
| 前端轮询性能 | 低 | 仅当前选中条目轮询，切换/锁定时停止 |
| otpauth URI 解析错误 | 低 | 后端严格校验，返回明确错误信息 |
| totp-rs crate 安全性 | 低 | 成熟开源库，广泛使用，需锁定版本 |

## 安全考量

1. **密钥不暴露给前端** — `generate_totp` 只返回验证码，不返回密钥
2. **加密存储** — `totp_secret` 与其他 Entry 数据一起被 ChaCha20-Poly1305 加密
3. **内存安全** — TOTP 计算完成后，临时密钥数据尽快释放
4. **输入验证** — 后端校验 base32 格式，拒绝无效密钥
5. **无日志泄露** — TOTP 密钥和验证码不写入任何日志

## 成功标准

- [ ] 用户可以为 WebsiteLogin 类型的条目添加 MFA 密钥
- [ ] 添加后能实时显示 6 位验证码和倒计时
- [ ] 验证码每 30 秒自动刷新，与 Google Authenticator 等应用结果一致
- [ ] 点击验证码可一键复制到剪贴板
- [ ] 支持粘贴 otpauth:// URI 自动提取 secret
- [ ] 支持直接粘贴 base32 secret
- [ ] 可以编辑或移除已设置的 MFA
- [ ] 旧版 .mmp 文件（无 totp_secret）可正常打开
- [ ] 锁定 vault 后 TOTP 定时器停止

## 里程碑

| 阶段 | 内容 | 任务数 |
|------|------|--------|
| Phase 1 | 后端：数据模型 + TOTP 命令 | 4 |
| Phase 2 | 前端：TOTP 组件 + 集成 | 4 |
| Phase 3 | 测试与国际化 | 2 |

---

**提案作者**: Claude Code
**最后更新**: 2026-04-14
