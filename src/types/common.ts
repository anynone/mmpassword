import type { VaultMeta } from "./vault";

export type { VaultMeta };

export interface AppConfig {
  theme: Theme;
  language: string;
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  openLastVault: boolean;
  recentVaults: VaultMeta[];
  lastVaultPath?: string;
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
  spaces: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  spaces: false,
};
