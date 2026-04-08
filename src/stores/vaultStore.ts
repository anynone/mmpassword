import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Vault, VaultMeta, Group, Entry, Field, FieldType, EntryType, CreateEntryRequest, UpdateEntryRequest, SubscriptionMeta } from "../types";
import type { GitSyncResult, DetectedSshKey, SshKeyValidation, GitAccessValidation } from "../types/git";

// --- Editing state types ---

export interface FieldInput {
  id: string;
  name: string;
  value: string;
  fieldType: FieldType;
}

export interface EntryFormData {
  title: string;
  entryType: EntryType;
  groupId: string;
  favorite: boolean;
  fields: FieldInput[];
}

export type EditingState =
  | { mode: "viewing" }
  | { mode: "editing"; entryId: string; originalData: EntryFormData; currentData: EntryFormData }
  | { mode: "creating"; originalData: EntryFormData; currentData: EntryFormData };

export interface VirtualEntry {
  id: string;
  isVirtual: true;
}

export const VIRTUAL_ENTRY_ID = "__virtual_entry__";

const defaultFieldInputs = (): FieldInput[] => [
  { id: crypto.randomUUID(), name: "Username", value: "", fieldType: "username" },
  { id: crypto.randomUUID(), name: "Password", value: "", fieldType: "password" },
  { id: crypto.randomUUID(), name: "Website", value: "", fieldType: "url" },
];

const emptyFormData = (): EntryFormData => ({
  title: "New Entry",
  entryType: "websiteLogin",
  groupId: "",
  favorite: false,
  fields: defaultFieldInputs(),
});

const entryToFormData = (entry: Entry): EntryFormData => ({
  title: entry.title,
  entryType: entry.entryType || "websiteLogin",
  groupId: entry.groupId || "",
  favorite: entry.favorite || false,
  fields: entry.fields.map((f) => ({
    id: crypto.randomUUID(),
    name: f.name,
    value: f.value,
    fieldType: f.fieldType || ("text" as FieldType),
  })),
});

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
  renameEntry: (id: string, newTitle: string) => Promise<Entry>;
  moveEntryToGroup: (id: string, groupId: string | null) => Promise<Entry>;
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

  // Subscription state
  subscriptionVault: Vault | null;
  subscriptionEntries: Entry[];
  subscriptionGroups: Group[];
  subscriptionSource: string | null;

  // Subscription operations
  fetchSubscription: (url: string) => Promise<Vault>;
  getSubscriptionHistory: () => Promise<SubscriptionMeta[]>;
  removeSubscriptionHistory: (url: string) => Promise<void>;
  clearSubscription: () => void;
  isSubscriptionEntry: (entryId: string) => boolean;
  mergedEntries: () => Entry[];
  mergedGroups: () => Group[];

  // UI state
  selectEntry: (id: string | null) => void;
  selectGroup: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;

  // Editing state
  editingState: EditingState;
  virtualEntry: VirtualEntry | null;
  startEditing: (entry: Entry) => void;
  startCreating: (groupId?: string) => void;
  cancelEditing: () => void;
  updateFormData: (data: Partial<EntryFormData>) => void;
  hasUnsavedChanges: () => boolean;
  isEditingActive: () => boolean;
  saveCurrentEditing: () => Promise<boolean>;
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
      // Also clear subscription data
      try {
        await invoke("clear_subscription");
      } catch {
        // Ignore subscription clear error
      }
      set({
        vault: null,
        entries: [],
        groups: [],
        isLocked: true,
        isUnlocked: false,
        selectedEntryId: null,
        selectedGroupId: null,
        subscriptionVault: null,
        subscriptionEntries: [],
        subscriptionGroups: [],
        subscriptionSource: null,
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

  renameEntry: async (id, newTitle) => {
    const state = useVaultStore.getState() as VaultState;
    const existing = state.entries.find((e) => e.id === id);
    if (!existing) throw new Error("Entry not found");
    const request: UpdateEntryRequest = {
      title: newTitle,
      groupId: existing.groupId,
      fields: existing.fields,
      tags: existing.tags,
      favorite: existing.favorite,
    };
    const entry = await invoke<Entry>("update_entry", { id, request });
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? entry : e)),
    }));
    return entry;
  },

  moveEntryToGroup: async (id, groupId) => {
    const state = useVaultStore.getState() as VaultState;
    const existing = state.entries.find((e) => e.id === id);
    if (!existing) throw new Error("Entry not found");
    const request: UpdateEntryRequest = {
      title: existing.title,
      groupId: groupId ?? undefined,
      fields: existing.fields,
      tags: existing.tags,
      favorite: existing.favorite,
    };
    const entry = await invoke<Entry>("update_entry", { id, request });
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? entry : e)),
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

  // Subscription state
  subscriptionVault: null,
  subscriptionEntries: [],
  subscriptionGroups: [],
  subscriptionSource: null,

  // Subscription operations
  fetchSubscription: async (url) => {
    set({ isLoading: true, error: null });
    try {
      const vault = await invoke<Vault>("fetch_subscription_vault", { url });
      set({
        subscriptionVault: vault,
        subscriptionEntries: vault.entries.map((e: Entry) => ({ ...e, _source: "subscription" as const })),
        subscriptionGroups: vault.groups,
        subscriptionSource: url,
        isLoading: false,
      });
      return vault;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  getSubscriptionHistory: async () => {
    try {
      return await invoke<SubscriptionMeta[]>("get_subscription_history");
    } catch (error) {
      set({ error: String(error) });
      return [];
    }
  },

  removeSubscriptionHistory: async (url) => {
    try {
      await invoke("remove_subscription_history", { url });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearSubscription: () => {
    set({
      subscriptionVault: null,
      subscriptionEntries: [],
      subscriptionGroups: [],
      subscriptionSource: null,
    });
  },

  isSubscriptionEntry: (entryId) => {
    const state = useVaultStore.getState() as VaultState;
    return state.subscriptionEntries.some((e) => e.id === entryId);
  },

  mergedEntries: () => {
    const state = useVaultStore.getState() as VaultState;
    const subEntries = state.subscriptionEntries.map((e) => ({
      ...e,
      _source: "subscription" as const,
    }));
    return [...state.entries, ...subEntries];
  },

  mergedGroups: () => {
    const state = useVaultStore.getState() as VaultState;
    return [...state.groups, ...state.subscriptionGroups];
  },

  // UI state
  selectEntry: (id) => set({ selectedEntryId: id }),
  selectGroup: (id) => set({ selectedGroupId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearError: () => set({ error: null }),

  // Editing state
  editingState: { mode: "viewing" },
  virtualEntry: null,

  startEditing: (entry) => {
    const formData = entryToFormData(entry);
    const originalData: EntryFormData = JSON.parse(JSON.stringify(formData));
    set({
      editingState: { mode: "editing", entryId: entry.id, originalData, currentData: formData },
      virtualEntry: null,
    });
  },

  startCreating: (groupId) => {
    const data = emptyFormData();
    if (groupId) data.groupId = groupId;
    const originalData: EntryFormData = JSON.parse(JSON.stringify(data));
    set({
      editingState: { mode: "creating", originalData, currentData: data },
      virtualEntry: { id: VIRTUAL_ENTRY_ID, isVirtual: true },
      selectedEntryId: VIRTUAL_ENTRY_ID,
    });
  },

  cancelEditing: () => {
    set((state) => ({
      editingState: { mode: "viewing" },
      virtualEntry: null,
      selectedEntryId: state.editingState.mode === "creating" ? null : state.selectedEntryId,
    }));
  },

  updateFormData: (data) => {
    set((state) => {
      if (state.editingState.mode === "viewing") return state;
      const current = state.editingState.currentData;
      return {
        editingState: {
          ...state.editingState,
          currentData: { ...current, ...data },
        },
      };
    });
  },

  hasUnsavedChanges: (): boolean => {
    const state = useVaultStore.getState() as VaultState;
    if (state.editingState.mode === "viewing") return false;
    const { originalData, currentData } = state.editingState;
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  },

  isEditingActive: (): boolean => {
    const state = useVaultStore.getState() as VaultState;
    return state.editingState.mode !== "viewing";
  },

  saveCurrentEditing: async (): Promise<boolean> => {
    const state = useVaultStore.getState() as VaultState;
    if (state.editingState.mode === "viewing") return true;

    const formData = state.editingState.currentData;

    if (!formData.title.trim()) {
      // Title is required, can't save
      return false;
    }

    const entryFields: Field[] = formData.fields
      .filter((f) => f.name.trim() && f.value.trim())
      .map((f) => ({
        name: f.name.trim(),
        value: f.value,
        fieldType: f.fieldType,
        protected: f.fieldType === "password",
      }));

    try {
      if (state.editingState.mode === "editing") {
        await state.updateEntry(state.editingState.entryId, {
          title: formData.title.trim(),
          groupId: formData.groupId || undefined,
          fields: entryFields,
          tags: [],
          favorite: formData.favorite,
        });
      } else if (state.editingState.mode === "creating") {
        const newEntry = await state.createEntry({
          title: formData.title.trim(),
          entryType: formData.entryType,
          groupId: formData.groupId || undefined,
          fields: entryFields,
          tags: [],
          favorite: formData.favorite,
        });
        useVaultStore.getState().selectEntry(newEntry.id);
      }

      state.cancelEditing();
      return true;
    } catch {
      return false;
    }
  },
}));
