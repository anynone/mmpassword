# mmpassword

A free, open-source, cross-platform password manager with local encrypted storage.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## Features

- 🔐 **Strong Encryption**: Argon2id key derivation + ChaCha20-Poly1305 authenticated encryption
- 💾 **Local Storage**: Your passwords never leave your device
- 📁 **Groups**: Organize entries with custom groups
- ⭐ **Favorites**: Quick access to your most used passwords
- 🔑 **Password Generator**: Generate strong random passwords
- 📋 **Clipboard**: One-click copy to clipboard
- 🌙 **Dark Mode**: Support for light and dark themes
- 🖥️ **Cross-Platform**: Windows, macOS, and Linux

## Security

mmpassword uses industry-standard cryptographic algorithms:

- **Key Derivation**: Argon2id (64MB memory, 3 iterations, 4 parallelism)
- **Encryption**: ChaCha20-Poly1305 with 96-bit nonces
- **Memory Safety**: Sensitive data is securely wiped from memory using `zeroize`

## Installation

### Download

Download the latest release for your platform from the [Releases](https://github.com/mmpassword/mmpassword/releases) page.

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Rust](https://rustup.rs/) 1.70+
- Platform-specific dependencies:
  - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools

#### Build Steps

```bash
# Clone the repository
git clone https://github.com/mmpassword/mmpassword.git
cd mmpassword

# Install dependencies
npm install

# Development mode
npm run tauri dev

# Build for production
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Usage

### Creating a New Vault

1. Click **"New Vault"** on the welcome screen
2. Enter a name for your vault
3. Choose where to save the `.mmp` file
4. Create a strong master password (minimum 8 characters)
5. Click **"Create Vault"**

### Opening an Existing Vault

1. Click **"Open Local File"** on the welcome screen
2. Select your `.mmp` vault file
3. Enter your master password
4. Click **"Unlock"**

### Adding an Entry

1. Click the **"+"** button or **"New Entry"** button
2. Fill in the entry details:
   - **Title**: Name for this entry
   - **Group**: Optional group categorization
   - **Fields**: Add username, password, URL, notes, etc.
3. Click **"Create Entry"**

### Editing an Entry

1. Click on an entry to view details
2. Click the **edit icon** (pencil)
3. Modify the fields as needed
4. Click **"Save Changes"**

### Using the Password Generator

When editing a password field, click the **key icon** to generate a random 16-character password containing:
- Uppercase and lowercase letters
- Numbers
- Special characters

### Copying to Clipboard

- Click the **copy icon** next to any field to copy its value
- A notification will confirm the copy action

### Creating Groups

1. Click the **"+"** button in the Groups sidebar
2. Enter a group name
3. Select an icon
4. Click **"Create"**

### Locking the Vault

- Click the **lock icon** in the top navigation bar
- Or the vault will automatically lock when you close the application

## File Format

mmpassword vaults use the `.mmp` file format:

```
┌─────────────────────────────────────────┐
│ Header (8 bytes)                        │
│ - Magic: "MMP1" (4 bytes)               │
│ - Version: u16 LE (2 bytes)             │
│ - Reserved (2 bytes)                    │
├─────────────────────────────────────────┤
│ Salt (16 bytes)                         │
│ - Argon2id salt                         │
├─────────────────────────────────────────┤
│ Encrypted Data                          │
│ - Nonce (12 bytes)                      │
│ - Ciphertext + Auth Tag                 │
└─────────────────────────────────────────┘
```

## Development

### Project Structure

```
mmpassword/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # React components
│   ├── stores/             # Zustand state management
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── src-tauri/              # Backend (Rust + Tauri)
│   └── src/
│       ├── commands/       # Tauri IPC commands
│       ├── crypto/         # Cryptographic functions
│       ├── models/         # Data models
│       ├── storage/        # File storage
│       └── state.rs        # Application state
└── openspec/               # Design documents
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Rust, Tauri 2.0
- **Crypto**: Argon2, ChaCha20-Poly1305 (via RustCrypto)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Roadmap

### Phase 1 (Current)
- [x] Local password management
- [x] Groups and favorites
- [x] Password generator
- [x] Cross-platform support

### Phase 2 (Planned)
- [ ] GitHub sync
- [ ] Browser extension
- [ ] Password breach checking
- [ ] Import/Export (Bitwarden, 1Password)

---

Made with ❤️ by the mmpassword team
