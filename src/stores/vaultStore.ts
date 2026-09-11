import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Vault, VaultMeta, Group, Entry, Field, FieldType, EntryType, CreateEntryRequest, UpdateEntryRequest, LastGitVault, VaultOpenTarget } from "../types";
import { toOpenVaultTargetConfig } from "../types";
import type { GitSyncResult, DetectedSshKey, SshKeyValidation, GitAccessValidation } from "../types/git";
import { getDefaultFieldName } from "../lib/fieldDefaults";

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

// --- Multi-vault tab types ---

/**
 * Per-vault state slice. Several vaults can be open at the same time; the
 * tab list is the single source of truth, the top-level store fields (entries,
 * groups, selection, editing state, ...) are projections of the active tab so
 * existing components keep working unchanged.
 */
export interface VaultTab {
  vaultId: string;
  name: string;
  /** How this vault was opened (local file or Git repo) - survives locking */
  target: VaultOpenTarget;
  status: "unlocked" | "locked";
  /** Vault metadata - null while locked */
  vault: Vault | null;
  entries: Entry[];
  groups: Group[];
  editingState: EditingState;
  virtualEntry: VirtualEntry | null;
  selectedEntryId: string | null;
  selectedGroupId: string | null;
  searchQuery: string;
  /** Number of in-flight background sync operations for this vault */
  pendingSyncCount: number;
  syncError: string | null;
}

const lockedEditingState: EditingState = { mode: "viewing" };

const makeTab = (vault: Vault, target: VaultOpenTarget): VaultTab => ({
  vaultId: vault.id,
  name: vault.name,
  target,
  status: "unlocked",
  vault,
  entries: vault.entries,
  groups: vault.groups,
  editingState: lockedEditingState,
  virtualEntry: null,
  selectedEntryId: null,
  selectedGroupId: null,
  searchQuery: "",
  pendingSyncCount: 0,
  syncError: null,
});

/** Derive a display name for a not-yet-unlocked vault */
const targetDisplayName = (target: VaultOpenTarget): string => {
  if (target.type === "git") return target.vault.repoName;
  return target.path.split(/[\\/]/).pop()?.replace(/\.mmp$/i, "") || "Vault";
};

/**
 * A locked placeholder tab for a vault restored from the previous session.
 * Its vaultId is synthetic until the vault is actually unlocked (decryption
 * reveals the real vault id, and registerOpenedVault replaces this tab).
 */
const makeLockedTab = (target: VaultOpenTarget): VaultTab => ({
  vaultId: `locked-${crypto.randomUUID()}`,
  name: targetDisplayName(target),
  target,
  status: "locked",
  vault: null,
  entries: [],
  groups: [],
  editingState: lockedEditingState,
  virtualEntry: null,
  selectedEntryId: null,
  selectedGroupId: null,
  searchQuery: "",
  pendingSyncCount: 0,
  syncError: null,
});

/** Structural equality for vault open targets (plain serializable objects) */
const sameTarget = (a: VaultOpenTarget, b: VaultOpenTarget): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Clear all sensitive data of a tab after its vault got locked */
const lockTab = (tab: VaultTab): VaultTab => ({
  ...tab,
  status: "locked",
  vault: null,
  entries: [],
  groups: [],
  editingState: lockedEditingState,
  virtualEntry: null,
  selectedEntryId: null,
  selectedGroupId: null,
  searchQuery: "",
  pendingSyncCount: 0,
  syncError: null,
});

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

const extractRepoName = (repoUrl: string): string => {
  const trimmed = repoUrl.trim().replace(/\.git$/i, "");
  const path = trimmed.startsWith("git@")
    ? trimmed.split(":").pop() || trimmed
    : trimmed;
  return path.split(/[\\/]/).pop() || "Unknown";
};

const buildLastGitVault = (
  repoUrl: string,
  branch: string,
  vaultPath: string,
  keyPath: string
): LastGitVault => ({
  repoUrl,
  branch,
  vaultPath,
  keyPath,
  repoName: extractRepoName(repoUrl),
});

interface VaultState {
  // Multi-vault state (source of truth)
  tabs: VaultTab[];
  activeVaultId: string | null;
  /** Whether any vault tab is open (locked or unlocked) */
  hasOpenVaults: boolean;
  /** Transient flag: the last open/created vault was already open (for toasting) */
  lastOpenWasDuplicate: boolean;

  // Projection of the active tab (consumed by existing components)
  vault: Vault | null;
  currentVaultTarget: VaultOpenTarget | null;
  entries: Entry[];
  groups: Group[];
  isLocked: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
  selectedEntryId: string | null;
  selectedGroupId: string | null;
  searchQuery: string;
  /** Number of in-flight background sync operations. UI treats >0 as "syncing". */
  pendingSyncCount: number;
  syncError: string | null;

  // Vault operations
  createVault: (name: string, password: string, path: string) => Promise<void>;
  unlockVault: (path: string, password: string) => Promise<void>;
  lockVault: () => Promise<void>;
  lockAllVaults: () => Promise<void>;
  closeVault: (vaultId: string) => Promise<void>;
  switchVault: (vaultId: string) => void;
  /** Restore the previous session's vaults as locked placeholder tabs */
  restoreTabs: (targets: VaultOpenTarget[]) => void;
  getRecentVaults: () => Promise<VaultMeta[]>;
  /** Replace the in-memory vault of a tab (after bulk imports etc.); defaults to the active tab */
  applyVaultUpdate: (vault: Vault, vaultId?: string | null) => void;
  /** Patch a single entry in a tab's cache (e.g. after TOTP changes); defaults to the active tab */
  applyEntryUpdate: (entry: Entry, vaultId?: string | null) => void;

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
  pullGitVault: () => Promise<void>;

  // UI state
  selectEntry: (id: string | null, vaultId?: string | null) => void;
  selectGroup: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;

  // Sync state
  notifySyncStarted: (vaultId?: string) => void;
  notifySyncCompleted: (vaultId?: string) => void;
  notifySyncFailed: (message: string, vaultId?: string) => void;
  clearSyncError: () => void;

  // Editing state
  editingState: EditingState;
  virtualEntry: VirtualEntry | null;
  startEditing: (entry: Entry) => void;
  startCreating: (groupId?: string) => void;
  cancelEditing: (vaultId?: string | null) => void;
  updateFormData: (data: Partial<EntryFormData>) => void;
  hasUnsavedChanges: () => boolean;
  isEditingActive: () => boolean;
  saveCurrentEditing: () => Promise<boolean>;
}

/** Project the active tab onto the top-level mirror fields */
const projectActive = (state: {
  tabs: VaultTab[];
  activeVaultId: string | null;
}): Partial<VaultState> => {
  const tab = state.tabs.find((t) => t.vaultId === state.activeVaultId) ?? null;

  if (!tab || tab.status === "locked") {
    return {
      vault: null,
      // Keep the target of a locked tab so the unlock screen can offer it
      currentVaultTarget: tab ? tab.target : null,
      entries: [],
      groups: [],
      isLocked: true,
      isUnlocked: false,
      selectedEntryId: null,
      selectedGroupId: null,
      searchQuery: "",
      pendingSyncCount: 0,
      syncError: null,
      editingState: lockedEditingState,
      virtualEntry: null,
    };
  }

  return {
    vault: tab.vault,
    currentVaultTarget: tab.target,
    entries: tab.entries,
    groups: tab.groups,
    isLocked: false,
    isUnlocked: true,
    selectedEntryId: tab.selectedEntryId,
    selectedGroupId: tab.selectedGroupId,
    searchQuery: tab.searchQuery,
    pendingSyncCount: tab.pendingSyncCount,
    syncError: tab.syncError,
    editingState: tab.editingState,
    virtualEntry: tab.virtualEntry,
  };
};

/** Patch one tab and re-project the active tab mirrors */
const patchTab = (
  state: VaultState,
  vaultId: string,
  patch: (tab: VaultTab) => Partial<VaultTab>
): Partial<VaultState> => {
  const tabs = state.tabs.map((t) => (t.vaultId === vaultId ? { ...t, ...patch(t) } : t));
  return { tabs, hasOpenVaults: tabs.length > 0, ...projectActive({ ...state, tabs }) };
};

export const useVaultStore = create<VaultState>((set, get) => {
  /** Register a freshly opened/created vault as the active tab.
   * Dedupes by vault id and by open target — the latter replaces locked
   * placeholder tabs restored from a previous session. */
  const registerOpenedVault = (vault: Vault, target: VaultOpenTarget): void => {
    set((state) => {
      const tab = makeTab(vault, target);
      const matchIdx = state.tabs.findIndex(
        (t) => t.vaultId === vault.id || sameTarget(t.target, target)
      );
      // Only an already-unlocked match counts as "already open" (for toasting);
      // replacing a locked placeholder is the normal restore flow
      const isDuplicate = matchIdx >= 0 && state.tabs[matchIdx].status === "unlocked";
      const tabs =
        matchIdx >= 0
          ? state.tabs.map((t, i) => (i === matchIdx ? tab : t))
          : [...state.tabs, tab];
      const activeVaultId = vault.id;
      return {
        tabs,
        activeVaultId,
        hasOpenVaults: tabs.length > 0,
        lastOpenWasDuplicate: isDuplicate,
        error: null,
        ...projectActive({ ...state, tabs, activeVaultId }),
      };
    });
  };

  /** The vault id data commands should address (the active tab) */
  const requireActiveVaultId = (): string => {
    const id = get().activeVaultId;
    if (!id) throw new Error("No vault is open");
    return id;
  };

  return {
    // Initial state
    tabs: [],
    activeVaultId: null,
    hasOpenVaults: false,
    lastOpenWasDuplicate: false,

    vault: null,
    currentVaultTarget: null,
    entries: [],
    groups: [],
    isLocked: true,
    isUnlocked: false,
    isLoading: false,
    error: null,
    selectedEntryId: null,
    selectedGroupId: null,
    searchQuery: "",
    pendingSyncCount: 0,
    syncError: null,
    editingState: lockedEditingState,
    virtualEntry: null,

    // Vault operations
    createVault: async (name, password, path) => {
      set({ isLoading: true, error: null });
      try {
        const vault = await invoke<Vault>("create_vault", { name, password, path });
        registerOpenedVault(vault, { type: "local", path });
        set({ isLoading: false });
      } catch (error) {
        set({ error: String(error), isLoading: false });
        throw error;
      }
    },

    unlockVault: async (path, password) => {
      set({ isLoading: true, error: null });
      try {
        const vault = await invoke<Vault>("unlock_vault", { path, password });
        registerOpenedVault(vault, { type: "local", path });
        set({ isLoading: false });
      } catch (error) {
        set({ error: String(error), isLoading: false });
        throw error;
      }
    },

    lockVault: async () => {
      const vaultId = get().activeVaultId;
      if (!vaultId) return;
      try {
        await invoke("lock_vault", { vaultId });
        set((state) => {
          const tabs = state.tabs.map((t) => (t.vaultId === vaultId ? lockTab(t) : t));
          // Switch to another unlocked vault if there is one; otherwise the
          // locked tab stays active (drives the unlock screen)
          const nextActive =
            tabs.find((t) => t.status === "unlocked")?.vaultId ?? vaultId;
          return {
            tabs,
            activeVaultId: nextActive,
            ...projectActive({ ...state, tabs, activeVaultId: nextActive }),
          };
        });
      } catch (error) {
        set({ error: String(error) });
      }
    },

    lockAllVaults: async () => {
      try {
        await invoke("lock_all_vaults");
        set((state) => {
          const tabs = state.tabs.map(lockTab);
          return { tabs, ...projectActive({ ...state, tabs }) };
        });
      } catch (error) {
        set({ error: String(error) });
      }
    },

    closeVault: async (vaultId) => {
      // Closing a tab drops the session and removes it from the persisted
      // session list so it won't be restored on the next startup
      const state = get();
      const tab = state.tabs.find((t) => t.vaultId === vaultId);
      try {
        await invoke("close_vault", {
          vaultId,
          target: tab ? toOpenVaultTargetConfig(tab.target) : null,
        });
      } catch (error) {
        console.warn("Failed to close vault:", error);
      }
      set((state) => {
        const idx = state.tabs.findIndex((t) => t.vaultId === vaultId);
        const tabs = state.tabs.filter((t) => t.vaultId !== vaultId);
        let activeVaultId = state.activeVaultId;
        if (activeVaultId === vaultId) {
          const next = tabs[Math.min(Math.max(idx - 1, 0), tabs.length - 1)];
          activeVaultId = next?.vaultId ?? null;
        }
        return {
          tabs,
          activeVaultId,
          hasOpenVaults: tabs.length > 0,
          ...projectActive({ ...state, tabs, activeVaultId }),
        };
      });
    },

    switchVault: (vaultId) => {
      set((state) => ({
        activeVaultId: vaultId,
        ...projectActive({ ...state, activeVaultId: vaultId }),
      }));
    },

    restoreTabs: (targets) => {
      set((state) => {
        // Merge restored locked tabs (dedupe by target against live tabs)
        const tabs = [...state.tabs];
        for (const target of targets) {
          if (!tabs.some((t) => sameTarget(t.target, target))) {
            tabs.push(makeLockedTab(target));
          }
        }
        // The most recently opened vault becomes active and gets the unlock prompt
        const activeVaultId = tabs[tabs.length - 1]?.vaultId ?? state.activeVaultId;
        return {
          tabs,
          activeVaultId,
          hasOpenVaults: tabs.length > 0,
          ...projectActive({ ...state, tabs, activeVaultId }),
        };
      });
    },

    applyVaultUpdate: (vault, vaultId) => {
      const id = vaultId ?? get().activeVaultId;
      if (!id) return;
      set((state) =>
        patchTab(state, id, () => ({
          vault,
          entries: vault.entries,
          groups: vault.groups,
        }))
      );
    },

    applyEntryUpdate: (entry, vaultId) => {
      const id = vaultId ?? get().activeVaultId;
      if (!id) return;
      set((state) =>
        patchTab(state, id, (tab) => ({
          entries: tab.entries.map((e) => (e.id === entry.id ? entry : e)),
        }))
      );
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
      const vaultId = get().activeVaultId;
      if (!vaultId) return [];
      try {
        const entries = await invoke<Entry[]>("get_entries", { vaultId });
        set((state) => patchTab(state, vaultId, () => ({ entries })));
        return entries;
      } catch (error) {
        set({ error: String(error) });
        return [];
      }
    },

    createEntry: async (request) => {
      const vaultId = requireActiveVaultId();
      const entry = await invoke<Entry>("create_entry", { vaultId, request });
      set((state) => patchTab(state, vaultId, (tab) => ({ entries: [...tab.entries, entry] })));
      return entry;
    },

    updateEntry: async (id, request) => {
      const vaultId = requireActiveVaultId();
      const entry = await invoke<Entry>("update_entry", { vaultId, id, request });
      set((state) =>
        patchTab(state, vaultId, (tab) => ({
          entries: tab.entries.map((e) => (e.id === id ? entry : e)),
        }))
      );
      return entry;
    },

    renameEntry: async (id, newTitle): Promise<Entry> => {
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
      return state.updateEntry(id, request);
    },

    moveEntryToGroup: async (id, groupId) => {
      // The backend command persists to memory synchronously and pushes the
      // git commit in the background, so the UI gets the updated entry back
      // immediately. Background sync status is delivered via Tauri events.
      const vaultId = requireActiveVaultId();
      const entry = await invoke<Entry>("move_entry_to_group", {
        vaultId,
        id,
        groupId: groupId ?? null,
      });
      set((state) =>
        patchTab(state, vaultId, (tab) => ({
          entries: tab.entries.map((e) => (e.id === id ? entry : e)),
        }))
      );
      return entry;
    },

    deleteEntry: async (id) => {
      const vaultId = requireActiveVaultId();
      await invoke("delete_entry", { vaultId, id });
      set((state) =>
        patchTab(state, vaultId, (tab) => ({
          entries: tab.entries.filter((e) => e.id !== id),
          selectedEntryId: tab.selectedEntryId === id ? null : tab.selectedEntryId,
        }))
      );
    },

    // Group operations
    getGroups: async () => {
      const vaultId = get().activeVaultId;
      if (!vaultId) return [];
      try {
        const groups = await invoke<Group[]>("get_groups", { vaultId });
        set((state) => patchTab(state, vaultId, () => ({ groups })));
        return groups;
      } catch (error) {
        set({ error: String(error) });
        return [];
      }
    },

    createGroup: async (name, icon) => {
      const vaultId = requireActiveVaultId();
      const group = await invoke<Group>("create_group", { vaultId, name, icon });
      set((state) => patchTab(state, vaultId, (tab) => ({ groups: [...tab.groups, group] })));
      return group;
    },

    updateGroup: async (id, data) => {
      const vaultId = requireActiveVaultId();
      const group = await invoke<Group>("update_group", { vaultId, id, ...data });
      set((state) =>
        patchTab(state, vaultId, (tab) => ({
          groups: tab.groups.map((g) => (g.id === id ? group : g)),
        }))
      );
      return group;
    },

    deleteGroup: async (id) => {
      const vaultId = requireActiveVaultId();
      await invoke("delete_group", { vaultId, id });
      set((state) =>
        patchTab(state, vaultId, (tab) => ({
          groups: tab.groups.filter((g) => g.id !== id),
          selectedGroupId: tab.selectedGroupId === id ? null : tab.selectedGroupId,
        }))
      );
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
        registerOpenedVault(vault, {
          type: "git",
          vault: buildLastGitVault(repoUrl, branch, vaultPath, keyPath),
        });
        set({ isLoading: false });
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
        registerOpenedVault(vault, {
          type: "git",
          vault: buildLastGitVault(repoUrl, branch, vaultPath, keyPath),
        });
        set({ isLoading: false });
        return vault;
      } catch (error) {
        set({ error: String(error), isLoading: false });
        throw error;
      }
    },

    syncGitVault: async (password) => {
      const vaultId = requireActiveVaultId();
      set({ isLoading: true, error: null });
      try {
        const result = await invoke<GitSyncResult>("sync_git_vault", { vaultId, password });
        set({ isLoading: false });
        return result;
      } catch (error) {
        set({ error: String(error), isLoading: false });
        throw error;
      }
    },

    saveGitVault: async (commitMessage) => {
      const vaultId = requireActiveVaultId();
      set({ isLoading: true, error: null });
      try {
        const sha = await invoke<string>("save_git_vault", { vaultId, commitMessage: commitMessage ?? null });
        set({ isLoading: false });
        return sha;
      } catch (error) {
        set({ error: String(error), isLoading: false });
        throw error;
      }
    },

    pullGitVault: async () => {
      const vaultId = requireActiveVaultId();
      set({ isLoading: true, error: null });
      try {
        const vault = await invoke<Vault>("pull_git_vault", { vaultId });
        set((state) => ({
          isLoading: false,
          ...patchTab(state, vaultId, () => ({
            vault,
            entries: vault.entries,
            groups: vault.groups,
          })),
        }));
      } catch (error) {
        set({ error: String(error), isLoading: false });
      }
    },

    // UI state
    selectEntry: (id, vaultId) => {
      const vid = vaultId ?? get().activeVaultId;
      if (!vid) return;
      set((state) => patchTab(state, vid, () => ({ selectedEntryId: id })));
    },

    selectGroup: (id) => {
      const vaultId = get().activeVaultId;
      if (!vaultId) return;
      set((state) => patchTab(state, vaultId, () => ({ selectedGroupId: id })));
    },

    setSearchQuery: (query) => {
      const vaultId = get().activeVaultId;
      if (!vaultId) return;
      set((state) => patchTab(state, vaultId, () => ({ searchQuery: query })));
    },

    clearError: () => set({ error: null }),

    // Sync state
    notifySyncStarted: (vaultId) => {
      const id = vaultId ?? get().activeVaultId;
      if (!id) return;
      set((state) => patchTab(state, id, (tab) => ({ pendingSyncCount: tab.pendingSyncCount + 1 })));
    },

    notifySyncCompleted: (vaultId) => {
      const id = vaultId ?? get().activeVaultId;
      if (!id) return;
      set((state) =>
        patchTab(state, id, (tab) => ({
          pendingSyncCount: Math.max(0, tab.pendingSyncCount - 1),
        }))
      );
    },

    notifySyncFailed: (message, vaultId) => {
      const id = vaultId ?? get().activeVaultId;
      if (!id) return;
      set((state) =>
        patchTab(state, id, (tab) => ({
          pendingSyncCount: Math.max(0, tab.pendingSyncCount - 1),
          syncError: message,
        }))
      );
    },

    clearSyncError: () => {
      const vaultId = get().activeVaultId;
      if (!vaultId) {
        set({ syncError: null });
        return;
      }
      set((state) => patchTab(state, vaultId, () => ({ syncError: null })));
    },

    // Editing state
    startEditing: (entry) => {
      const vaultId = get().activeVaultId;
      if (!vaultId) return;
      const formData = entryToFormData(entry);
      const originalData: EntryFormData = JSON.parse(JSON.stringify(formData));
      set((state) =>
        patchTab(state, vaultId, () => ({
          editingState: { mode: "editing", entryId: entry.id, originalData, currentData: formData },
          virtualEntry: null,
        }))
      );
    },

    startCreating: (groupId) => {
      const vaultId = get().activeVaultId;
      if (!vaultId) return;
      const data = emptyFormData();
      if (groupId) data.groupId = groupId;
      const originalData: EntryFormData = JSON.parse(JSON.stringify(data));
      set((state) =>
        patchTab(state, vaultId, () => ({
          editingState: { mode: "creating", originalData, currentData: data },
          virtualEntry: { id: VIRTUAL_ENTRY_ID, isVirtual: true },
          selectedEntryId: VIRTUAL_ENTRY_ID,
        }))
      );
    },

    cancelEditing: (vaultId) => {
      const vid = vaultId ?? get().activeVaultId;
      if (!vid) return;
      set((state) =>
        patchTab(state, vid, (tab) => ({
          editingState: lockedEditingState,
          virtualEntry: null,
          selectedEntryId:
            tab.editingState.mode === "creating" ? null : tab.selectedEntryId,
        }))
      );
    },

    updateFormData: (data) => {
      const vaultId = get().activeVaultId;
      if (!vaultId) return;
      set((state) => {
        const tab = state.tabs.find((t) => t.vaultId === vaultId);
        if (!tab || tab.editingState.mode === "viewing") return {};
        const current = tab.editingState.currentData;
        return patchTab(state, vaultId, () => ({
          editingState: {
            ...tab.editingState,
            currentData: { ...current, ...data },
          },
        }));
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
      // Capture the vault being edited so a tab switch during the async save
      // can't route the result into a different vault
      const vaultId = state.activeVaultId;
      if (state.editingState.mode === "viewing") return true;

      const formData = state.editingState.currentData;

      if (!formData.title.trim()) {
        // Title is required, can't save
        return false;
      }

      const entryFields: Field[] = formData.fields
        .filter((f) => f.value.trim())
        .map((f) => ({
          name: f.name.trim() || getDefaultFieldName(f.fieldType),
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
          useVaultStore.getState().selectEntry(newEntry.id, vaultId);
        }

        useVaultStore.getState().cancelEditing(vaultId);
        return true;
      } catch {
        return false;
      }
    },
  };
});
