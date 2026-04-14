# Design: TOTP/MFA 验证码功能

| 字段 | 值 |
|------|-----|
| **变更名称** | totp-mfa |
| **版本** | 1.0 |
| **更新日期** | 2026-04-14 |

---

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TOTP 功能架构                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Frontend (React)                                                  │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│   │  │  TotpCard    │  │  TotpSetup   │  │  TotpCountdown   │  │   │
│   │  │  (展示卡片)  │  │  Dialog      │  │  (SVG 倒计时)    │  │   │
│   │  │              │  │  (设置弹窗)  │  │                  │  │   │
│   │  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │   │
│   │         │                 │                                  │   │
│   │         │  generate_totp  │  set_totp_secret                │   │
│   │         │  remove_totp    │  remove_totp_secret             │   │
│   └─────────┼─────────────────┼──────────────────────────────────┘   │
│             │                 │                                      │
│             │  Tauri IPC      │                                      │
│             ▼                 ▼                                      │
│   Backend (Rust)                                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│   │  │  commands/   │  │  totp-rs     │  │  models/entry.rs │  │   │
│   │  │  totp.rs     │  │  (RFC 6238)  │  │  +totp_secret    │  │   │
│   │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│   │                                                             │   │
│   │  ┌──────────────────────────────────────────────────────┐  │   │
│   │  │  storage: .mmp (ChaCha20-Poly1305 加密)              │  │   │
│   │  │  totp_secret 与其他 Entry 数据一起加密存储            │  │   │
│   │  └──────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据流

### 2.1 生成验证码（查看模式）

```
┌──────────┐   invoke("generate_totp")   ┌──────────┐
│  TotpCard │ ──────────────────────────▶ │  Rust    │
│  组件     │    { secret: "JBSW..." }   │  totp-rs │
│          │                              │          │
│          │ ◀──────────────────────────  │          │
│          │   { code: "482031",          │          │
│          │     remaining_seconds: 25 }  │          │
└──────────┘                              └──────────┘
     │
     │  setTimeout(25 * 1000)
     │
     ▼
  重新请求（新一轮 30 秒周期）
```

### 2.2 设置 TOTP 密钥

```
┌───────────┐                              ┌──────────┐
│  TotpSetup│   用户选择类型并粘贴          │  Preview │
│  Dialog   │──────────────────────────────▶│  调用    │
│           │   secret 或 otpauth URI      │  generate│
│           │                              │  _totp   │
│           │                              │  验证    │
│           │                              │  有效性  │
│           │                              │          │
│           │  点击 Save                    │          │
│           │──────────────────────────────▶│          │
│           │  invoke("set_totp_secret")   │          │
│           │  { id, secret }              │          │
│           │                              │          │
│           │ ◀─────────────────────────── │          │
│           │  更新后的 Entry              │          │
└───────────┘                              └──────────┘
```

### 2.3 移除 TOTP 密钥

```
┌──────────┐   invoke("remove_totp_secret")   ┌──────────┐
│  TotpCard │ ──────────────────────────────▶ │  Rust    │
│          │    { id }                        │  Backend │
│          │                                  │          │
│          │ ◀──────────────────────────────  │          │
│          │  更新后的 Entry (totp_secret=None)│          │
└──────────┘                                  └──────────┘
```

---

## 3. Rust 后端详细设计

### 3.1 依赖

```toml
# Cargo.toml 新增
totp-rs = "5"
```

### 3.2 TOTP 命令模块

```rust
// commands/totp.rs

use totp_rs::{Algorithm, TOTP, Secret};

/// TOTP 验证码结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TotpCode {
    /// 6位验证码
    pub code: String,
    /// 当前周期剩余秒数
    pub remaining_seconds: u32,
}

/// 生成 TOTP 验证码
#[tauri::command]
pub fn generate_totp(secret: String) -> Result<TotpCode, String> {
    // 1. 解析 base32 secret
    let totp_secret = Secret::Encoded(secret)
        .to_bytes()
        .map_err(|e| format!("Invalid secret: {}", e))?;

    // 2. 创建标准 TOTP 实例 (SHA-1, 6位, 30秒)
    let totp = TOTP::new(
        Algorithm::SHA1,
        6,                          // digits
        1,                          // skew
        30,                         // step
        totp_secret,                // secret
    )
    .map_err(|e| format!("TOTP init failed: {}", e))?;

    // 3. 生成当前验证码
    let code = totp.generate_current()
        .map_err(|e| format!("TOTP generation failed: {}", e))?;

    // 4. 计算剩余秒数
    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let remaining = 30 - (time % 30) as u32;

    Ok(TotpCode {
        code,
        remaining_seconds: remaining,
    })
}

/// 解析 otpauth:// URI，提取 base32 secret
fn parse_otpauth_uri(uri: &str) -> Result<String, String> {
    // otpauth://totp/Label?secret=BASE32&issuer=X
    let url = Url::parse(uri)
        .map_err(|e| format!("Invalid URI: {}", e))?;

    if url.scheme() != "otpauth" {
        return Err("Not an otpauth URI".into());
    }

    let secret = url.query_pairs()
        .find(|(k, _)| k == "secret")
        .map(|(_, v)| v.to_string())
        .ok_or("Missing 'secret' parameter in otpauth URI")?;

    // 验证 secret 有效性
    Secret::Encoded(secret.clone())
        .to_bytes()
        .map_err(|e| format!("Invalid secret in URI: {}", e))?;

    Ok(secret)
}
```

### 3.3 Entry 模型变更

```rust
// models/entry.rs — 变更点

pub struct Entry {
    // ... 现有字段保持不变 ...

    /// TOTP secret key (base32 encoded)
    /// None = 未设置 MFA
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub totp_secret: Option<String>,
}

// CreateEntryRequest 和 UpdateEntryRequest 不需要修改
// TOTP 密钥通过独立的 set_totp_secret / remove_totp_secret 命令管理
```

### 3.4 set_totp_secret 命令

```rust
#[tauri::command]
pub async fn set_totp_secret(
    id: String,
    secret: String,
    state: State<'_, AppState>,
) -> Result<Entry, String> {
    let entry_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID: {}", e))?;

    // 判断是 otpauth URI 还是纯 secret
    let base32_secret = if secret.starts_with("otpauth://") {
        parse_otpauth_uri(&secret)?
    } else {
        // 验证 base32 格式
        Secret::Encoded(secret.clone())
            .to_bytes()
            .map_err(|e| format!("Invalid base32 secret: {}", e))?;
        secret
    };

    // 验证 TOTP 可以正常生成（预检验）
    let _ = generate_totp(base32_secret.clone())?;

    // 更新 Entry
    let mut app_state = state.lock().map_err(|e| e.to_string())?;

    let (vault, key, salt) = extract_vault_and_credentials(&mut app_state)?;

    let entry = vault.get_entry_mut(entry_id)
        .ok_or("Entry not found")?;

    entry.totp_secret = Some(base32_secret);
    entry.updated_at = Utc::now();

    // 保存（遵循 Git Vault Save Pattern）
    // ...

    Ok(entry.clone())
}
```

---

## 4. 前端组件详细设计

### 4.1 组件层级

```
EntryDetail
├── Header (title + edit button)
├── Body
│   ├── TotpCard (NEW)              ← TOTP 展示区域
│   │   ├── TotpCountdown (NEW)     ← SVG 圆形倒计时
│   │   └── TotpSetupDialog (NEW)   ← 编辑弹窗 (Dialog)
│   │
│   ├── InlineField × N             ← 现有字段
│   └── Add Field Button
│
└── Footer (metadata)
```

### 4.2 TotpCard 组件

```
Props:
  - entry: Entry                    // 当前条目
  - onCopy: (code: string) => void  // 复制回调

State:
  - totpCode: string | null         // 当前验证码
  - remaining: number               // 剩余秒数
  - error: string | null            // 错误信息
  - showSetupDialog: boolean        // 控制编辑弹窗

Behavior:
  - entry.totpSecret 存在 → 启动轮询
  - entry.totpSecret 不存在 → 显示 "Add MFA" 按钮
  - 点击验证码 → 复制到剪贴板 + toast 提示
  - 点击 Edit → 打开 TotpSetupDialog
  - 点击 Remove → 确认后调用 remove_totp_secret
```

### 4.3 TotpCountdown 组件

```
SVG 圆形倒计时设计：

  viewBox="0 0 36 36"

  背景圆：
    cx=18 cy=18 r=16
    stroke: border/30
    stroke-width: 3

  进度圆：
    cx=18 cy=18 r=16
    stroke: 动态颜色（绿/黄/红）
    stroke-width: 3
    stroke-dasharray: 100.53 (2πr)
    stroke-dashoffset: 0 → 100.53 (从满到空)
    transform: rotate(-90deg)
    transition: stroke-dashoffset 1s linear

  颜色规则：
    remaining > 10s → hsl(var(--primary))    // 主色
    remaining 5-10s → hsl(amber-500)         // 警告色
    remaining < 5s  → hsl(red-500)           // 危险色

  中间文本：
    remaining 数字（12px font）
```

### 4.4 TotpSetupDialog 组件

```
Props:
  - entry: Entry
  - open: boolean
  - onOpenChange: (open: boolean) => void
  - onSuccess: (entry: Entry) => void

State:
  - inputType: "secret" | "uri"
  - inputValue: string
  - previewCode: string | null
  - previewRemaining: number | null
  - isValid: boolean
  - isSaving: boolean

Behavior:
  - 切换 inputType → 清空 inputValue
  - inputValue 变化 → debounce 300ms → 调用 generate_totp 预览
  - 预览成功 → isValid = true, 显示预览
  - 预览失败 → isValid = false, 显示错误
  - Save → set_totp_secret → onSuccess
```

---

## 5. 国际化

### 新增翻译键

```typescript
// 中英文翻译
{
  "totp": {
    // 卡片
    "title": "Two-Factor Authentication" / "两步验证",
    "verificationCode": "Verification Code" / "验证码",
    "addMfa": "Add MFA" / "添加 MFA",
    "editMfa": "Edit MFA" / "编辑 MFA",
    "removeMfa": "Remove MFA" / "移除 MFA",
    "copied": "Code copied" / "验证码已复制",
    "clickToCopy": "Click to copy" / "点击复制",
    "secondsLeft": "Valid for {s}s" / "{s} 秒后刷新",
    "generating": "Generating..." / "生成中...",

    // 设置弹窗
    "setupTitle": "Set Up MFA Verification" / "设置 MFA 验证",
    "editTitle": "Edit MFA Verification" / "编辑 MFA 验证",
    "inputTypeSecret": "Secret Key" / "密钥",
    "inputTypeUri": "otpauth URI" / "otpauth URI",
    "secretPlaceholder": "Paste your base32 secret key" / "粘贴 base32 密钥",
    "uriPlaceholder": "Paste otpauth:// URI" / "粘贴 otpauth:// URI",
    "preview": "Preview" / "预览",
    "invalidSecret": "Invalid secret key" / "无效的密钥",
    "invalidUri": "Invalid otpauth URI" / "无效的 otpauth URI",

    // 确认
    "confirmRemove": "Remove MFA verification?" / "移除 MFA 验证？",
    "confirmRemoveMessage": "This will remove the MFA secret from this entry. You will need to re-add it from the service's security settings." / "将从该条目中移除 MFA 密钥。你需要从服务的安全设置中重新获取。"
  }
}
```

---

## 6. Git Vault Save Pattern 集成

set_totp_secret 和 remove_totp_secret 必须遵循项目的 Git Vault Save Pattern：

```rust
// commands/totp.rs

pub async fn set_totp_secret(id: String, secret: String, state: State<'_, AppState>) -> ... {
    // ... 验证和解析 secret ...

    // ★ 关键：提取 Git 信息 BEFORE 任何 await
    let mut app_state = state.lock().map_err(|e| e.to_string())?;

    // 更新 entry
    // ...

    // 提取保存所需信息
    let (vault_clone, key_clone, salt_clone) = ...;
    let git_info = get_git_sync_info(&app_state);
    let local_path = get_local_vault_path(&app_state);

    // 释放锁
    drop(app_state);

    // 保存（可以在 await 之前提取所有数据）
    if let Some((repository, clone_dir)) = git_info {
        let engine = GitSyncEngine::new(repository, clone_dir);
        engine.save_vault(&vault_clone, &key_clone, &salt_clone, Some("Update TOTP secret")).await?;
    } else if let Some(path) = local_path {
        save_vault_file_with_key(&path, &vault_clone, &key_clone, &salt_clone)?;
    }

    Ok(entry)
}
```

---

**文档版本**: 1.0
**最后更新**: 2026-04-14
