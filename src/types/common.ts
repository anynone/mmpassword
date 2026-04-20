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
