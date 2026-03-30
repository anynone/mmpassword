# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mmpassword is a cross-platform desktop password manager built with:
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Rust + Tauri 2.0
- **Crypto**: Argon2id (key derivation) + ChaCha20-Poly1305 (encryption)

Features local encrypted storage (.mmp file format) and optional GitHub repository sync.

## Build Commands

```bash
# Development (hot reload)
npm run tauri:dev

# Production build
npm run tauri:build

# Frontend-only
npm run dev        # Vite dev server
npm run build      # Build frontend

# Rust tests
cd src-tauri && cargo test
```

## Architecture

```
Frontend (React)                          Backend (Rust)
┌────────────────────┐                   ┌────────────────────┐
│ Screens            │                   │ Commands (IPC)     │
│ Components         │                   │   vault, entry,    │
│ Stores (Zustand)   │ ─── invoke() ───▶ │   group, git       │
│ Types              │                   │                    │
└────────────────────┘                   ├────────────────────┤
                                         │ Models & State     │
                                         │ Crypto (Argon2id,  │
                                         │   ChaCha20)        │
                                         │ Storage (.mmp)     │
                                         │ Git sync           │
                                         └────────────────────┘
```

**Key patterns:**
- Tauri IPC: Frontend calls backend via `invoke()` with type-safe commands
- State: Zustand stores (frontend) + `RwLock<AppState>` (backend)
- Session: `VaultSession` holds decrypted vault + encryption key in memory

## Directory Structure

- `src/` - React frontend with components organized by domain (common, entry, git, group, screens)
- `src-tauri/src/` - Rust backend with commands, crypto, models, storage, git, sync modules
- `design/` - UI/UX design docs (Chinese)
- `PRd/` - Product requirements (Chinese)
- `openspec/` - OpenSpec workflow for managing changes

## Key Files

- `src/App.tsx` - Screen routing (Welcome → Unlock → Main)
- `src/stores/vaultStore.ts` - Vault state and operations
- `src-tauri/src/lib.rs` - Command registration and app setup
- `src-tauri/src/state.rs` - VaultSession, EncryptionKey types
- `src-tauri/src/crypto/` - Argon2id KDF + ChaCha20-Poly1305 encryption

## OpenSpec Workflow

This project uses OpenSpec for structured change management:
- `/opsx:explore` - Think through ideas and requirements
- `/opsx:propose` - Create change proposals
- `/opsx:apply` - Implement changes
- `/opsx:archive` - Archive completed changes

## File Format (.mmp)

```
Header: "MMP1" magic + version (8 bytes)
Salt: Argon2id salt (16 bytes)
Encrypted: Nonce (12 bytes) + ChaCha20-Poly1305 ciphertext
```

## Important Patterns

### Git Vault Save Pattern (CRITICAL)
When modifying entry/group commands, extract Git sync info BEFORE any await to avoid Send trait issues with parking_lot locks:
```rust
// Extract Git info BEFORE any await
if let Some((repository, clone_dir)) = get_git_sync_info(state) {
    let engine = GitSyncEngine::new(repository, clone_dir);
    engine.save_vault(vault, key, salt, Some("commit message")).await?;
} else if let Some(path) = get_local_vault_path(state) {
    save_vault_file_with_key(&path, vault, key, salt)?;
}
```

### Git Repository Cloning
The `clone_repository` function in `git/operations.rs` handles:
1. Existing branches: clone directly with `--branch` flag
2. Non-existent branches on repos with commits: clone default, create branch, push
3. Empty repositories: init locally, create initial commit, add remote, push

### Modal with Scrollable Content
Modal component supports scrollable body with fixed footer:
```tsx
<Modal footer={<Buttons />}>
  {/* Content scrolls if it exceeds max-h-[85vh] */}
</Modal>
```

## Notes

- Frontend has no test infrastructure (no Jest/Vitest)
- UI follows Material Design 3 color system (see tailwind.config.js)
- Product and design documentation is in Chinese
- Git repos are cloned to `~/.mmpassword/repos/<hash>/` where hash is SHA-256 of repo URL
