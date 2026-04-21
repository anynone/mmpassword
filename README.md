<div align="center">

# mmpassword

安全、免费、开源的密码管理器。\
你的密码，只留在你身边 — 始终加密。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#)

[下载](#下载) · [从源码构建](#从源码构建) · [反馈问题](https://github.com/anynone/mmpassword/issues) · [功能建议](https://github.com/anynone/mmpassword/issues)

[English](README_en.md)

</div>

---

## 为什么选择 mmpassword？

- **无云端，无服务器** — 所有数据以加密的 `.mmp` 文件存储在本地，除非你主动设置，否则不会上传任何内容
- **业界认可的加密算法** — Argon2id 密钥派生 + ChaCha20-Poly1305 加密，全球安全专家信赖的算法组合
- **可选 Git 同步** — 通过私有 Git 仓库同步保险库，自带完整版本历史和冲突解决
- **跨平台** — Windows、macOS、Linux 原生桌面应用
- **永久免费** — 无订阅、无广告、无追踪，MIT 开源协议

---

## 功能列表

### 保险库

- 使用主密码创建多个加密保险库
- 启动时自动打开上次的保险库
- 最近打开的保险库列表，快速访问
- 可配置的空闲自动锁定超时
- 锁定时自动清除内存中的敏感数据

### 条目管理

- **网站登录** — 存储用户名、密码、网址等
- **安全笔记** — 自由格式的加密笔记
- 6 种自定义字段类型：文本、密码、邮箱、网址、备注、用户名
- 行内编辑 — 点击字段即可直接修改
- 智能图标 — 根据网站自动匹配（GitHub、Google、Twitter 等）
- 密码强度指示器（弱 → 非常强）
- 拖拽条目到不同分组
- 右键菜单：复制用户名、复制密码、重命名、删除

### TOTP（两步验证）

- 通过 base32 密钥或 `otpauth://` URI 添加 TOTP
- 实时验证码显示，30 秒倒计时
- 一键复制验证码
- 设置时实时预览生成的验证码

### 分组

- 自定义分组管理条目
- 为每个分组选择图标
- 拖拽条目在分组间移动
- 按分组筛选条目

### 密码生成器

- 可配置密码长度（4-64 位，默认 16 位）
- 自由组合字符类型：大写字母、小写字母、数字、特殊符号
- 使用密码学安全随机数生成
- 保证每种启用的字符类型至少出现一次
- 内置于密码字段编辑器中，一键生成并填入

### 搜索

- 实时搜索所有条目
- 按标题即时筛选

### Git 同步

- 通过任意 Git 仓库同步（GitHub、GitLab、自建服务）
- SSH 密钥自动检测和验证
- 三步设置向导：SSH 密钥 → 仓库 → 保险库
- 每次修改后后台自动同步
- 同步状态指示器
- **冲突解决** — 支持多种策略处理同时编辑：
  - 保留最新 / 保留本地 / 保留远程
  - 保留两者或跳过

### 外观与体验

- 浅色、深色和跟随系统主题
- 支持英文和简体中文
- 三栏布局：分组 → 条目列表 → 条目详情
- 记住窗口大小和位置

### 剪贴板

- 一键复制任意字段
- 可配置的剪贴板自动清除超时

### 安全

- **密钥派生**：Argon2id（内存困难型，抗 GPU 暴力破解）
- **加密算法**：ChaCha20-Poly1305（认证加密）
- **内存安全**：敏感数据使用后通过 `zeroize` 安全擦除
- 主密码最低 8 位

---

## 下载

从 [Releases](https://github.com/anynone/mmpassword/releases) 页面下载最新版本。

## 从源码构建

### 环境要求

- [Node.js](https://nodejs.org/) 18+ 和 npm
- [Rust](https://rustup.rs/) 1.70+
- 平台依赖：
  - **Linux**：`sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**：Xcode Command Line Tools
  - **Windows**：Microsoft Visual Studio C++ Build Tools

### 构建步骤

```bash
git clone https://github.com/anynone/mmpassword.git
cd mmpassword
npm install
npm run tauri:build
```

构建产物位于 `src-tauri/target/release/bundle/`。

---

---

## 参与贡献

欢迎贡献！随时提交 Issue 或 Pull Request。

## 许可证

[MIT](LICENSE)
