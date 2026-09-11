import type { VaultMeta } from "./vault";
import type { GitRepoMeta } from "./git";

export type { VaultMeta };

export interface LastGitVault {
  repoUrl: string;
  branch: string;
  vaultPath: string;
  keyPath: string;
  /** Display name extracted from vault_path or repo_url. */
  repoName: string;
}

export type VaultOpenTarget =
  | { type: "local"; path: string }
  | { type: "git"; vault: LastGitVault };

/** Serialized form of VaultOpenTarget stored in the backend config */
export interface OpenVaultTargetConfig {
  targetType: "local" | "git";
  path?: string | null;
  git?: LastGitVault | null;
}

/** Convert a config-stored open-vault entry into a VaultOpenTarget */
export function toVaultOpenTarget(entry: OpenVaultTargetConfig): VaultOpenTarget | null {
  if (entry.targetType === "local" && entry.path) {
    return { type: "local", path: entry.path };
  }
  if (entry.targetType === "git" && entry.git) {
    return { type: "git", vault: entry.git };
  }
  return null;
}

/** Convert a VaultOpenTarget into the config-stored form */
export function toOpenVaultTargetConfig(target: VaultOpenTarget): OpenVaultTargetConfig {
  if (target.type === "local") {
    return { targetType: "local", path: target.path, git: null };
  }
  return { targetType: "git", path: null, git: target.vault };
}

export interface AppConfig {
  theme: Theme;
  language: string;
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  openLastVault: boolean;
  recentVaults: VaultMeta[];
  lastVaultPath?: string;
  lastGitVault?: LastGitVault;
  recentGitRepos: GitRepoMeta[];
  openVaults?: OpenVaultTargetConfig[];
  windowState: WindowState;
}

export type Theme = "light" | "dark" | "system";

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: false,
};
