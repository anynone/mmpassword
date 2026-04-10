import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Theme, AppConfig, LastGitVault } from "../types";

interface SettingsState {
  theme: Theme;
  language: string;
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  openLastVault: boolean;
  lastVaultPath: string | null;
  lastGitVault: LastGitVault | null;

  // Internal: preserve fields not managed by this store
  _appConfig: AppConfig | null;

  // Actions
  loadSettings: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  setAutoLockMinutes: (minutes: number) => void;
  setClipboardClearSeconds: (seconds: number) => void;
  setOpenLastVault: (open: boolean) => void;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  theme: "system",
  language: "en",
  autoLockMinutes: 15,
  clipboardClearSeconds: 30,
  openLastVault: true,
  lastVaultPath: null,
  lastGitVault: null,
  _appConfig: null,

  // Actions
  loadSettings: async () => {
    try {
      const config = await invoke<AppConfig>("get_config");
      set({
        theme: config.theme,
        language: config.language,
        autoLockMinutes: config.autoLockMinutes,
        clipboardClearSeconds: config.clipboardClearSeconds,
        openLastVault: config.openLastVault,
        lastVaultPath: config.lastVaultPath ?? null,
        lastGitVault: config.lastGitVault ?? null,
        _appConfig: config,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  setTheme: (theme) => {
    set({ theme });
    get().saveSettings();
  },

  setLanguage: (language) => {
    set({ language });
    get().saveSettings();
  },

  setAutoLockMinutes: (autoLockMinutes) => {
    set({ autoLockMinutes });
    get().saveSettings();
  },

  setClipboardClearSeconds: (clipboardClearSeconds) => {
    set({ clipboardClearSeconds });
    get().saveSettings();
  },

  setOpenLastVault: (openLastVault) => {
    set({ openLastVault });
    get().saveSettings();
  },

  saveSettings: async () => {
    try {
      const state = get();
      const existing = state._appConfig;
      const config: AppConfig = {
        theme: state.theme,
        language: state.language,
        autoLockMinutes: state.autoLockMinutes,
        clipboardClearSeconds: state.clipboardClearSeconds,
        openLastVault: state.openLastVault,
        recentVaults: existing?.recentVaults ?? [],
        lastVaultPath: existing?.lastVaultPath,
        lastGitVault: existing?.lastGitVault,
        recentGitRepos: existing?.recentGitRepos ?? [],
        windowState: existing?.windowState ?? {
          width: 1200,
          height: 800,
          maximized: false,
        },
      };
      await invoke("update_config", { config });
      // Update _appConfig so subsequent saves preserve latest state
      set({ _appConfig: config });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },
}));
