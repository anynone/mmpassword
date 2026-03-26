# Design: mmpassword MVP

| 字段 | 值 |
|------|-----|
| **变更名称** | mmpassword-mvp |
| **版本** | 1.0 |
| **更新日期** | 2026-03-26 |

---

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        mmpassword 系统架构                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                   Frontend Layer (WebView)                       │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐      │   │
│   │  │   React     │  │  Zustand    │  │   Tailwind CSS      │      │   │
│   │  │   18        │  │  Store      │  │   + Material Design │      │   │
│   │  └─────────────┘  └─────────────┘  └─────────────────────┘      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                          Tauri IPC (@tauri-apps/api)                    │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                   Rust Backend Layer                             │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐      │   │
│   │  │  Commands   │  │   Models    │  │     Services        │      │   │
│   │  │  (Tauri)    │  │  (Serde)    │  │                     │      │   │
│   │  └─────────────┘  └─────────────┘  └─────────────────────┘      │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐      │   │
│   │  │   Crypto    │  │   Storage   │  │      State          │      │   │
│   │  │   Module    │  │   Module    │  │     Manager         │      │   │
│   │  └─────────────┘  └─────────────┘  └─────────────────────┘      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                   File System (.mmp files)                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 目录结构

```
mmpassword/
├── src-tauri/                           # Rust 后端
│   ├── Cargo.toml                       # Rust 依赖配置
│   ├── tauri.conf.json                  # Tauri 配置
│   ├── capabilities/                    # Tauri 2.0 权限配置
│   │   └── default.json
│   └── src/
│       ├── main.rs                      # 应用入口
│       ├── lib.rs                       # 库导出
│       ├── error.rs                     # 错误类型定义
│       ├── state.rs                     # 应用状态
│       │
│       ├── commands/                    # Tauri IPC 命令
│       │   ├── mod.rs
│       │   ├── vault.rs                 # 密码库命令
│       │   ├── entry.rs                 # 条目命令
│       │   └── group.rs                 # 分组命令
│       │
│       ├── crypto/                      # 加密模块
│       │   ├── mod.rs
│       │   ├── kdf.rs                   # Argon2id 密钥派生
│       │   ├── cipher.rs                # ChaCha20-Poly1305 加密
│       │   └── random.rs                # 安全随机数
│       │
│       ├── storage/                     # 存储模块
│       │   ├── mod.rs
│       │   ├── vault_file.rs            # .mmp 文件格式
│       │   └── config.rs                # 应用配置
│       │
│       └── models/                      # 数据模型
│           ├── mod.rs
│           ├── vault.rs                 # 密码库模型
│           ├── entry.rs                 # 条目模型
│           ├── group.rs                 # 分组模型
│           └── field.rs                 # 字段模型
│
├── src/                                 # React 前端
│   ├── main.tsx                         # 入口
│   ├── App.tsx                          # 根组件
│   ├── vite-env.d.ts                    # Vite 类型
│   │
│   ├── components/                      # UI 组件
│   │   ├── layout/                      # 布局组件
│   │   │   ├── TopNavBar.tsx
│   │   │   ├── SideNavBar.tsx
│   │   │   ├── MainContent.tsx
│   │   │   ├── DetailPanel.tsx
│   │   │   └── StatusBar.tsx
│   │   │
│   │   ├── screens/                     # 页面组件
│   │   │   ├── WelcomeScreen.tsx        # P01 欢迎页
│   │   │   ├── UnlockScreen.tsx         # P02 解锁页
│   │   │   ├── MainScreen.tsx           # P03 主界面
│   │   │   ├── EditScreen.tsx           # P04 编辑页
│   │   │   └── NewVaultScreen.tsx       # P08 新建密码库
│   │   │
│   │   ├── entry/                       # 条目组件
│   │   │   ├── EntryList.tsx
│   │   │   ├── EntryItem.tsx
│   │   │   ├── EntryDetail.tsx
│   │   │   └── EntryForm.tsx
│   │   │
│   │   ├── group/                       # 分组组件
│   │   │   ├── GroupList.tsx
│   │   │   └── GroupItem.tsx
│   │   │
│   │   └── common/                      # 通用组件
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── PasswordInput.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── ThemeToggle.tsx
│   │
│   ├── hooks/                           # 自定义 Hooks
│   │   ├── useVault.ts
│   │   ├── useTheme.ts
│   │   └── useToast.ts
│   │
│   ├── services/                        # Tauri IPC 服务
│   │   ├── vault.ts
│   │   ├── entry.ts
│   │   └── group.ts
│   │
│   ├── stores/                          # Zustand 状态管理
│   │   ├── vaultStore.ts
│   │   ├── uiStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── types/                           # TypeScript 类型
│   │   ├── vault.ts
│   │   ├── entry.ts
│   │   ├── group.ts
│   │   └── common.ts
│   │
│   ├── styles/
│   │   └── globals.css                  # Tailwind 入口
│   │
│   └── utils/
│       └── format.ts
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
└── index.html
```

---

## 3. 数据模型设计

### 3.1 密码库文件格式 (.mmp)

```
┌─────────────────────────────────────────────────────────────────┐
│                    .mmp 文件结构                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Offset    Size      Field          Description               │
│   ──────    ────      ─────          ───────────               │
│   0x00      4         MAGIC          "MMP1" (0x4D4D5031)       │
│   0x04      2         VERSION        格式版本 (0x0001)         │
│   0x06      2         RESERVED       保留字段                  │
│   0x08      16        SALT           Argon2id 盐值             │
│   0x18      12        NONCE          ChaCha20 Nonce            │
│   0x24      var       CIPHERTEXT     加密的 JSON 数据          │
│   EOF-16    16        TAG            Poly1305 认证标签         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Rust 数据模型

```rust
// models/vault.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vault {
    pub id: Uuid,
    pub name: String,
    pub version: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub groups: Vec<Group>,
    pub entries: Vec<Entry>,
}

// models/group.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: Uuid,
    pub name: String,
    pub icon: Option<String>,
    pub created_at: DateTime<Utc>,
}

// models/entry.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: Uuid,
    pub title: String,
    pub entry_type: EntryType,
    pub group_id: Option<Uuid>,
    pub fields: Vec<Field>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EntryType {
    WebsiteLogin,
    SecureNote,
}

// models/field.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Field {
    pub name: String,
    pub value: String,
    pub field_type: FieldType,
    pub protected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FieldType {
    Text,
    Password,
    Url,
    Email,
    Notes,
}
```

### 3.3 TypeScript 类型定义

```typescript
// types/vault.ts
export interface Vault {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  groups: Group[];
  entries: Entry[];
}

// types/group.ts
export interface Group {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
}

// types/entry.ts
export interface Entry {
  id: string;
  title: string;
  entryType: 'WebsiteLogin' | 'SecureNote';
  groupId?: string;
  fields: Field[];
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// types/common.ts
export interface Field {
  name: string;
  value: string;
  fieldType: 'Text' | 'Password' | 'Url' | 'Email' | 'Notes';
  protected: boolean;
}
```

---

## 4. 加密方案

### 4.1 密钥派生 (Argon2id)

```
┌─────────────────────────────────────────────────────────────────┐
│                    密钥派生流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   主密码 (UTF-8)                                                 │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────────────────────────────────┐                   │
│   │           Argon2id                       │                   │
│   │                                          │                   │
│   │  参数:                                   │                   │
│   │  • m_cost = 65536 KB (64 MB)            │                   │
│   │  • t_cost = 3 iterations                │                   │
│   │  • p_cost = 4 parallelism               │                   │
│   │  • output_len = 32 bytes                │                   │
│   │                                          │                   │
│   └─────────────────────────────────────────┘                   │
│        │                                                        │
│        ▼                                                        │
│   加密密钥 (32 bytes)                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 数据加密 (ChaCha20-Poly1305)

```rust
// crypto/cipher.rs
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Nonce,
};

pub fn encrypt(plaintext: &[u8], key: &[u8; 32], nonce: &[u8; 12]) -> Result<Vec<u8>> {
    let cipher = ChaCha20Poly1305::new(key.into());
    let nonce = Nonce::from(nonce);
    cipher.encrypt(&nonce, plaintext).map_err(|e| Error::Encryption(e.to_string()))
}

pub fn decrypt(ciphertext: &[u8], key: &[u8; 32], nonce: &[u8; 12]) -> Result<Vec<u8>> {
    let cipher = ChaCha20Poly1305::new(key.into());
    let nonce = Nonce::from(nonce);
    cipher.decrypt(&nonce, ciphertext).map_err(|e| Error::Decryption(e.to_string()))
}
```

---

## 5. Tauri IPC 命令设计

### 5.1 密码库命令

```rust
// commands/vault.rs

/// 创建新密码库
#[tauri::command]
pub async fn create_vault(
    name: String,
    password: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<Vault, String>

/// 打开密码库
#[tauri::command]
pub async fn open_vault(
    path: String,
    state: State<'_, AppState>,
) -> Result<VaultMeta, String>

/// 解锁密码库
#[tauri::command]
pub async fn unlock_vault(
    path: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<Vault, String>

/// 锁定密码库
#[tauri::command]
pub async fn lock_vault(
    state: State<'_, AppState>,
) -> Result<(), String>

/// 保存密码库
#[tauri::command]
pub async fn save_vault(
    state: State<'_, AppState>,
) -> Result<(), String>

/// 获取最近打开的密码库列表
#[tauri::command]
pub async fn get_recent_vaults() -> Result<Vec<VaultMeta>, String>
```

### 5.2 条目命令

```rust
// commands/entry.rs

/// 获取所有条目
#[tauri::command]
pub async fn get_entries(
    state: State<'_, AppState>,
) -> Result<Vec<Entry>, String>

/// 获取单个条目
#[tauri::command]
pub async fn get_entry(
    id: String,
    state: State<'_, AppState>,
) -> Result<Entry, String>

/// 创建条目
#[tauri::command]
pub async fn create_entry(
    entry: CreateEntryRequest,
    state: State<'_, AppState>,
) -> Result<Entry, String>

/// 更新条目
#[tauri::command]
pub async fn update_entry(
    id: String,
    entry: UpdateEntryRequest,
    state: State<'_, AppState>,
) -> Result<Entry, String>

/// 删除条目
#[tauri::command]
pub async fn delete_entry(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String>
```

### 5.3 分组命令

```rust
// commands/group.rs

/// 获取所有分组
#[tauri::command]
pub async fn get_groups(
    state: State<'_, AppState>,
) -> Result<Vec<Group>, String>

/// 创建分组
#[tauri::command]
pub async fn create_group(
    name: String,
    icon: Option<String>,
    state: State<'_, AppState>,
) -> Result<Group, String>

/// 更新分组
#[tauri::command]
pub async fn update_group(
    id: String,
    name: String,
    icon: Option<String>,
    state: State<'_, AppState>,
) -> Result<Group, String>

/// 删除分组
#[tauri::command]
pub async fn delete_group(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String>
```

---

## 6. 前端状态管理

### 6.1 Zustand Store 设计

```typescript
// stores/vaultStore.ts
import { create } from 'zustand';

interface VaultState {
  // 状态
  vault: Vault | null;
  isLocked: boolean;
  isUnlocked: boolean;
  selectedEntryId: string | null;
  selectedGroupId: string | null;
  isLoading: boolean;
  error: string | null;

  // 操作
  createVault: (name: string, password: string, path: string) => Promise<void>;
  openVault: (path: string) => Promise<void>;
  unlockVault: (path: string, password: string) => Promise<void>;
  lockVault: () => Promise<void>;
  saveVault: () => Promise<void>;

  // 条目操作
  selectEntry: (id: string | null) => void;
  createEntry: (entry: CreateEntryRequest) => Promise<void>;
  updateEntry: (id: string, entry: UpdateEntryRequest) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  // 分组操作
  selectGroup: (id: string | null) => void;
  createGroup: (name: string) => Promise<void>;
  updateGroup: (id: string, name: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  // 初始状态
  vault: null,
  isLocked: true,
  isUnlocked: false,
  selectedEntryId: null,
  selectedGroupId: null,
  isLoading: false,
  error: null,

  // 实现方法...
}));
```

---

## 7. UI 组件设计

### 7.1 页面路由

```
┌─────────────────────────────────────────────────────────────────┐
│                      页面状态机                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                                              │
│   │  Welcome     │ ◄─── 应用启动                                │
│   │  Screen      │                                              │
│   └──────┬───────┘                                              │
│          │                                                      │
│          ├── 新建密码库 ──────► NewVaultScreen                  │
│          │                           │                          │
│          │                           ▼                          │
│          ├── 打开密码库 ──────► UnlockScreen                    │
│          │                           │                          │
│          │                    输入密码                           │
│          │                           │                          │
│          │                           ▼                          │
│          └──────────────────► MainScreen                        │
│                                      │                          │
│                               编辑条目                           │
│                                      │                          │
│                                      ▼                          │
│                                EditScreen                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 组件层级

```
App
├── ThemeProvider
│   └── VaultProvider
│       └── ToastProvider
│           │
│           ├── WelcomeScreen          (vault === null)
│           │   ├── TopNavBar
│           │   ├── RecentVaultsList
│           │   └── ActionCards
│           │
│           ├── UnlockScreen           (vault !== null && isLocked)
│           │   ├── TopNavBar
│           │   └── UnlockForm
│           │
│           ├── NewVaultScreen         (creating vault)
│           │   ├── TopNavBar
│           │   └── NewVaultForm
│           │
│           └── MainScreen             (vault !== null && !isLocked)
│               ├── TopNavBar
│               ├── VaultTabs
│               ├── MainContent
│               │   ├── SideNavBar
│               │   │   ├── VaultHeader
│               │   │   ├── GroupList
│               │   │   └── ActionBar
│               │   ├── EntryList
│               │   │   ├── SearchBar
│               │   │   └── EntryItems
│               │   └── DetailPanel
│               │       ├── EntryHeader
│               │       ├── EntryFields
│               │       └── EntryActions
│               └── StatusBar
│
└── EditScreen (Modal/Overlay)
    ├── EditHeader
    ├── EditForm
    │   ├── BasicInfoSection
    │   ├── CredentialsSection
    │   └── CustomFieldsSection
    └── EditActions
```

---

## 8. 依赖清单

### 8.1 Rust 依赖 (Cargo.toml)

```toml
[package]
name = "mmpassword"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
# Tauri
tauri = { version = "2", features = ["shell-open"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-clipboard-manager = "2"

# Async Runtime
tokio = { version = "1", features = ["full"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Cryptography
argon2 = "0.5"
chacha20poly1305 = "0.10"
rand = "0.8"
zeroize = "1.8"

# Data Types
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }

# Error Handling
thiserror = "1"
anyhow = "1"

# Logging
log = "0.4"
env_logger = "0.11"

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

### 8.2 前端依赖 (package.json)

```json
{
  "name": "mmpassword",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.2",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-clipboard-manager": "^2.0.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1"
  }
}
```

---

## 9. Tailwind 配置

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Material Design 3 颜色系统
        primary: {
          DEFAULT: '#005ea1',
          container: '#2b78bf',
          fixed: '#d2e4ff',
          'fixed-dim': '#a0caff',
        },
        secondary: {
          DEFAULT: '#49607d',
          container: '#c4dcfe',
        },
        tertiary: {
          DEFAULT: '#7b5500',
          container: '#9a6c00',
        },
        surface: {
          DEFAULT: '#f9f9f9',
          dim: '#dadada',
          bright: '#f9f9f9',
          container: '#eeeeee',
          'container-low': '#f3f3f3',
          'container-high': '#e8e8e8',
          'container-highest': '#e2e2e2',
          'container-lowest': '#ffffff',
        },
        outline: {
          DEFAULT: '#717782',
          variant: '#c1c7d2',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#414751',
        'on-primary': '#ffffff',
        'on-primary-container': '#fdfcff',
        'on-secondary': '#ffffff',
        'on-tertiary': '#ffffff',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
```

---

**文档版本**: 1.0
**最后更新**: 2026-03-26
