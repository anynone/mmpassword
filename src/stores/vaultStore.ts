import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Vault, VaultMeta, Group, Entry, CreateEntryRequest, UpdateEntryRequest } from "../types";
import type { GitSyncResult, DetectedSshKey, SshKeyValidation, GitAccessValidation } from "../types/git";

interface VaultState {
  // State
  vault: Vault | null;
  entries: Entry[];
  groups: Group[];
  isLocked: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
  selectedEntryId: string | null;
  selectedGroupId: string | null;
  searchQuery: string;

  // Vault operations
  createVault: (name: string, password: string, path: string) => Promise<void>;
  unlockVault: (path: string, password: string) => Promise<void>;
  lockVault: () => Promise<void>;
  getRecentVaults: () => Promise<VaultMeta[]>;

  // Entry operations
  getEntries: () => Promise<Entry[]>;
  createEntry: (request: CreateEntryRequest) => Promise<Entry>;
  updateEntry: (id: string, request: UpdateEntryRequest) => Promise<Entry>;
  deleteEntry: (id: string) => Promise<void>;

  // Group operations
  getGroups: () => Promise<Group[]>;
  createGroup: (name: string, icon?: string) => Promise<Group>;
  updateGroup: (id: string, data: { name?: string; icon?: string }) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;

  // Git operations
  detectSshKeys: () => Promise<DetectedSshKey[]>;
  validateSshKey: (keyPath: string) => Promise<SshKeyValidation>;
  validateGitAccess: (repoUrl: string, keyPath: string) => Promise<GitAccessValidation>;
  createGitVault: (repoUrl: string, branch: string, vaultPath: string, keyPath: string, name: string, password: string) => Promise<Vault>;
  openGitVault: (repoUrl: string, branch: string, vaultPath: string, keyPath: string, password: string) => Promise<Vault>;
  syncGitVault: (password: string) => Promise<GitSyncResult>;
  saveGitVault: (commitMessage?: string) => Promise<string>;

  // UI state
  selectEntry: (id: string | null) => void;
  selectGroup: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  // Initial state
  vault: null,
  entries: [],
  groups: [],
  isLocked: true,
  isUnlocked: false,
  isLoading: false,
  error: null,
  selectedEntryId: null,
  selectedGroupId: null,
  searchQuery: "",

  // Vault operations
  createVault: async (name, password, path) => {
    set({ isLoading: true, error: null });
    try {
      const vault = await invoke<Vault>("create_vault", { name, password, path });
      set({
        vault,
        entries: vault.entries,
        groups: vault.groups,
        isLocked: false,
        isUnlocked: true,
        isLoading: false
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  unlockVault: async (path, password) => {
    set({ isLoading: true, error: null });
    try {
      const vault = await invoke<Vault>("unlock_vault", { path, password });
      set({
        vault,
        entries: vault.entries,
        groups: vault.groups,
        isLocked: false,
        isUnlocked: true,
        isLoading: false
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  lockVault: async () => {
    try {
      await invoke("lock_vault");
      set({
        vault: null,
        entries: [],
        groups: [],
        isLocked: true,
        isUnlocked: false,
        selectedEntryId: null,
        selectedGroupId: null,
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  getRecentVaults: async () => {
    try {
      return await invoke<VaultMeta[]>("get_recent_vaults");
    } catch (error) {
      set({ error: String(error) });
      return [];
    }
  },

  // Entry operations
  getEntries: async () => {
    try {
      const entries = await invoke<Entry[]>("get_entries");
      set({ entries });
      return entries;
    } catch (error) {
      set({ error: String(error) });
      return [];
    }
  },

  createEntry: async (request) => {
    const entry = await invoke<Entry>("create_entry", { request });
    set((state) => ({ entries: [...state.entries, entry] }));
    return entry;
  },

  updateEntry: async (id, request) => {
    const entry = await invoke<Entry>("update_entry", { id, request });
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? entry : e)),
    }));
    return entry;
  },

  deleteEntry: async (id) => {
    await invoke("delete_entry", { id });
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId,
    }));
  },

  // Group operations
  getGroups: async () => {
    try {
      const groups = await invoke<Group[]>("get_groups");
      set({ groups });
      return groups;
    } catch (error) {
      set({ error: String(error) });
      return [];
    }
  },

  createGroup: async (name, icon) => {
    const group = await invoke<Group>("create_group", { name, icon });
    set((state) => ({ groups: [...state.groups, group] }));
    return group;
  },

  updateGroup: async (id, data) => {
    const group = await invoke<Group>("update_group", { id, ...data });
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? group : g)),
    }));
    return group;
  },

  deleteGroup: async (id) => {
    await invoke("delete_group", { id });
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
    }));
  },

  // Git operations
  detectSshKeys: async () => {
    try {
      return await invoke<DetectedSshKey[]>("detect_ssh_keys");
    } catch (error) {
      set({ error: String(error) });
      return [];
    }
  },

  validateSshKey: async (keyPath) => {
    try {
      return await invoke<SshKeyValidation>("validate_ssh_key", { keyPath });
    } catch (error) {
      return {
        valid: false,
        keyType: undefined,
        fingerprint: undefined,
        error: String(error),
      };
    }
  },

  validateGitAccess: async (repoUrl, keyPath) => {
    try {
      return await invoke<GitAccessValidation>("validate_git_access", { repoUrl, keyPath });
    } catch (error) {
      return {
        valid: false,
        repoName: undefined,
        defaultBranch: undefined,
        error: String(error),
      };
    }
  },

  createGitVault: async (repoUrl, branch, vaultPath, keyPath, name, password) => {
    set({ isLoading: true, error: null });
    try {
      const vault = await invoke<Vault>("create_git_vault", { repoUrl, branch, vaultPath, keyPath, name, password });
      set({
        vault,
        entries: vault.entries,
        groups: vault.groups,
        isLocked: false,
        isUnlocked: true,
        isLoading: false,
      });
      return vault;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  openGitVault: async (repoUrl, branch, vaultPath, keyPath, password) => {
    set({ isLoading: true, error: null });
    try {
      const vault = await invoke<Vault>("open_git_vault", { repoUrl, branch, vaultPath, keyPath, password });
      set({
        vault,
        entries: vault.entries,
        groups: vault.groups,
        isLocked: false,
        isUnlocked: true,
        isLoading: false,
      });
      return vault;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  syncGitVault: async (password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await invoke<GitSyncResult>("sync_git_vault", { password });
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  saveGitVault: async (commitMessage) => {
    set({ isLoading: true, error: null });
    try {
      const sha = await invoke<string>("save_git_vault", { commitMessage: commitMessage ?? null });
      set({ isLoading: false });
      return sha;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  // UI state
  selectEntry: (id) => set({ selectedEntryId: id }),
  selectGroup: (id) => set({ selectedGroupId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearError: () => set({ error: null }),
}));
