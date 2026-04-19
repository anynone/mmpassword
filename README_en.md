<div align="center">

# mmpassword

A secure, free, and open-source password manager. \
Your passwords stay on your device — encrypted, always.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#)

[Download](#download) · [Build from Source](#build-from-source) · [Report Bug](https://github.com/anynone/mmpassword/issues) · [Request Feature](https://github.com/anynone/mmpassword/issues)

[中文](README.md)

</div>

---

## Why mmpassword?

- **No cloud, no server** — All data is stored locally in an encrypted `.mmp` file. Nothing is uploaded unless you choose to sync.
- **Proven cryptography** — Argon2id for key derivation, ChaCha20-Poly1305 for encryption. The same algorithms trusted by security professionals worldwide.
- **Optional Git sync** — Sync your vault through a private Git repository. Full version history, conflict resolution included.
- **Cross-platform** — Native desktop app for Windows, macOS, and Linux.
- **Free forever** — No subscriptions, no ads, no tracking. Fully open-source under MIT license.

---

## Features

### Vault

- Create multiple encrypted vaults with a master password
- Auto-open the last vault on startup
- Recent vaults list for quick access
- Auto-lock after configurable idle timeout
- Vault lock wipes sensitive data from memory

### Entries

- **Website Login** — store username, password, URL, and more
- **Secure Notes** — freeform encrypted notes
- Custom fields with 6 types: text, password, email, URL, notes, username
- Inline editing — click any field to edit directly
- Smart icons based on website (GitHub, Google, Twitter, etc.)
- Password strength indicator (Weak → Very Strong)
- Drag-and-drop entries between groups
- Context menu: copy username, copy password, rename, delete

### TOTP (Two-Factor Authentication)

- Add TOTP to any login entry via base32 secret or `otpauth://` URI
- Live verification code with 30-second countdown
- One-click copy TOTP code
- Real-time preview during setup

### Groups

- Organize entries with custom groups
- Choose icons for each group
- Drag-and-drop to move entries between groups
- Filter entries by group

### Password Generator

- Generate strong 16-character passwords
- Includes uppercase, lowercase, digits, and special characters
- Built into the password field editor

### Search

- Real-time search across all entries
- Filter by title instantly

### Git Sync

- Sync vaults through any Git repository (GitHub, GitLab, self-hosted)
- SSH key auto-detection and validation
- Three-step setup wizard: SSH key → Repository → Vault
- Background auto-sync on every change
- Sync status indicator
- **Conflict resolution** — handles simultaneous edits with configurable strategies:
  - Prefer newest / local / remote
  - Keep both or skip

### Appearance

- Light, Dark, and System themes
- English and Simplified Chinese
- Three-panel layout: Groups → Entries → Detail
- Window size and position remembered

### Clipboard

- One-click copy for any field
- Auto-clear clipboard after configurable timeout

### Security

- **Key Derivation**: Argon2id (memory-hard, resistant to GPU attacks)
- **Encryption**: ChaCha20-Poly1305 (authenticated encryption)
- **Memory Safety**: Sensitive data wiped with `zeroize` after use
- Master password minimum 8 characters

---

## Download

Download the latest release for your platform from the [Releases](https://github.com/anynone/mmpassword/releases) page.

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Rust](https://rustup.rs/) 1.70+
- Platform-specific dependencies:
  - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools

### Build

```bash
git clone https://github.com/anynone/mmpassword.git
cd mmpassword
npm install
npm run tauri:build
```

The built application will be in `src-tauri/target/release/bundle/`.

---

## Roadmap

- [ ] Customizable password generator

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

[MIT](LICENSE)
