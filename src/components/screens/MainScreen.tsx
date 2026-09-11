import { useState, useEffect, useRef } from "react"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { confirm, open } from "@tauri-apps/plugin-dialog"
import { listen } from "@tauri-apps/api/event"
import { useVaultStore } from "../../stores/vaultStore"
import { useSettingsStore } from "../../stores/settingsStore"
import { TopNavBar, SideNavBar, StatusBar, EntryList, EntryDetail, VaultTabStrip, type AddVaultAction } from "../layout"
import { GroupDialog } from "../group"
import { SettingsModal, AboutSettings } from "../settings"
import { GitRepoSetupModal } from "../git"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"
import { useAutoLock } from "../../hooks/useAutoLock"
import type { Entry, Group } from "../../types"

/** Payload of the backend `sync:*` events */
interface SyncEventPayload {
  vaultId: string
  error?: string
}

interface MainScreenProps {
  /** Open a local vault file (switches to the unlock screen) */
  onAddLocalVault: (path: string) => void;
  /** Switch to the "create new vault" screen */
  onCreateVault: () => void;
  onOpenGitVault: (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    password: string
  ) => void;
  onCreateGitVault: (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    name: string,
    password: string
  ) => void;
}

export function MainScreen({
  onAddLocalVault,
  onCreateVault,
  onOpenGitVault,
  onCreateGitVault,
}: MainScreenProps) {
  // Auto-lock on idle
  useAutoLock();

  const clipboardTimeoutRef = useRef<number | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isGitSetupOpen, setIsGitSetupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const {
    activeVaultId,
    selectedEntryId,
    selectedGroupId,
    selectGroup,
    getEntries,
    getGroups,
    deleteEntry,
    deleteGroup,
    lockVault,
    editingState,
    entries,
  } = useVaultStore();

  const pendingSyncCount = useVaultStore((s) => s.pendingSyncCount);
  const syncError = useVaultStore((s) => s.syncError);

  const { showToast } = useToast();
  const { t } = useTranslation();
  const { clipboardClearSeconds } = useSettingsStore();

  // Load data for the active vault
  useEffect(() => {
    if (activeVaultId) {
      loadData();
    }
  }, [activeVaultId]);

  // Listen to backend sync events so we can surface "syncing" status in the
  // footer while background git commit+push work runs. Events carry the
  // vault id so counters stay correct when several vaults are open.
  useEffect(() => {
    const unlistenPromises = [
      listen<SyncEventPayload>("sync:started", (event) => {
        useVaultStore.getState().notifySyncStarted(event.payload?.vaultId);
      }),
      listen<SyncEventPayload>("sync:failed", (event) => {
        useVaultStore
          .getState()
          .notifySyncFailed(event.payload?.error ?? "Unknown sync error", event.payload?.vaultId);
      }),
      listen<SyncEventPayload>("sync:completed", (event) => {
        useVaultStore.getState().notifySyncCompleted(event.payload?.vaultId);
      }),
    ];
    return () => {
      unlistenPromises.forEach((p) => {
        p.then((unlisten) => unlisten()).catch(() => {});
      });
    };
  }, []);

  // Inform the user when a vault they tried to add was already open
  useEffect(() => {
    const checkDuplicate = () => {
      if (useVaultStore.getState().lastOpenWasDuplicate) {
        showToast("info", t("vaultTabs.alreadyOpen"));
        useVaultStore.setState({ lastOpenWasDuplicate: false });
      }
    };
    // The flag may have been set while this screen was not mounted
    checkDuplicate();
    const unsubscribe = useVaultStore.subscribe(checkDuplicate);
    return unsubscribe;
  }, [showToast, t]);

  // Show a toast if a background sync fails so the user is informed.
  useEffect(() => {
    if (syncError) {
      showToast("error", t("sync.failed", { error: syncError }));
      useVaultStore.getState().clearSyncError();
    }
  }, [syncError, showToast, t]);

  // Cleanup clipboard timeout on unmount
  useEffect(() => {
    return () => {
      if (clipboardTimeoutRef.current) {
        clearTimeout(clipboardTimeoutRef.current);
      }
    };
  }, []);

  const loadData = async () => {
    await Promise.all([getEntries(), getGroups()]);
  };

  // Filter entries by selected group
  const filteredEntries = selectedGroupId
    ? entries.filter((e) => e.groupId === selectedGroupId)
    : entries;

  // Handle lock: locks only the active vault. If other unlocked vaults
  // remain the active tab switches automatically and the screen stays;
  // otherwise the app transitions to the unlock screen.
  const handleLock = async () => {
    await lockVault();
  };

  // Handle settings
  const handleSettings = () => {
    setIsSettingsOpen(true);
  };

  // Handle about
  const handleAbout = () => {
    setIsAboutOpen(true);
  };

  // Handle the "+" menu in the vault tab strip
  const handleAddVault = async (action: AddVaultAction) => {
    if (action === "local") {
      const selected = await open({
        multiple: false,
        filters: [{ name: "mmpassword Vault", extensions: ["mmp"] }],
      });
      if (selected && typeof selected === "string") {
        onAddLocalVault(selected);
      }
    } else if (action === "git") {
      setIsGitSetupOpen(true);
    } else {
      onCreateVault();
    }
  };

  const handleGitSetupComplete = (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    password: string,
    isNew: boolean,
    name?: string
  ) => {
    setIsGitSetupOpen(false);
    if (isNew && name) {
      onCreateGitVault(repoUrl, branch, vaultPath, keyPath, name, password);
    } else {
      onOpenGitVault(repoUrl, branch, vaultPath, keyPath, password);
    }
  };

  // Entry actions
  const handleDeleteEntry = async (entry: Entry) => {
    const confirmed = await confirm(t("main.deleteEntryConfirm", { title: entry.title }), {
      title: t("main.deleteEntry"),
      kind: "warning",
    });
    if (confirmed) {
      await deleteEntry(entry.id);
      showToast("success", t("main.entryDeleted"));
    }
  };

  const handleCopyFieldFromDetail = async (fieldName: string, value: string) => {
    await writeText(value);
    showToast("success", t("entryDetail.copiedToClipboard", { field: fieldName }));
    // Clear previous timeout and set new one
    if (clipboardTimeoutRef.current) {
      clearTimeout(clipboardTimeoutRef.current);
    }
    clipboardTimeoutRef.current = setTimeout(async () => {
      await writeText("");
    }, clipboardClearSeconds * 1000);
  };

  // Group actions
  const handleCreateGroup = () => {
    setEditingGroup(null);
    setIsGroupDialogOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setIsGroupDialogOpen(true);
  };

  const handleDeleteGroup = async (group: Group) => {
    const confirmed = await confirm(
      t("main.deleteGroupConfirm", { name: group.name }),
      {
        title: t("main.deleteGroup"),
        kind: "warning",
      }
    );
    if (confirmed) {
      await deleteGroup(group.id);
      showToast("success", t("main.groupDeleted"));
    }
  };

  // Get selected entry (null if virtual entry is selected)
  const selectedEntry = editingState.mode === "creating"
    ? null
    : entries.find((e) => e.id === selectedEntryId);

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Top Navigation Bar */}
      <TopNavBar onLock={handleLock} onSettings={handleSettings} onAbout={handleAbout} />

      {/* Open vault tabs + add vault */}
      <VaultTabStrip onAddVault={handleAddVault} />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* SideNavBar - Groups */}
        <SideNavBar
          selectedGroupId={selectedGroupId}
          onSelectGroup={selectGroup}
          onCreateGroup={handleCreateGroup}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
        />

        {/* Entry List */}
        <EntryList
          entries={filteredEntries}
          selectedEntryId={selectedEntryId}
          onDeleteEntry={handleDeleteEntry}
        />

        {/* Entry Detail */}
        <EntryDetail
          entry={selectedEntry || null}
          onCopyField={handleCopyFieldFromDetail}
        />
      </div>

      {/* Footer */}
      <StatusBar status="unlocked" isSyncing={pendingSyncCount > 0} />

      {/* Group Dialog (still uses modal) */}
      <GroupDialog
        isOpen={isGroupDialogOpen}
        onClose={() => {
          setIsGroupDialogOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
      />

      {/* Git repo setup (add vault from Git) */}
      <GitRepoSetupModal
        isOpen={isGitSetupOpen}
        onClose={() => setIsGitSetupOpen(false)}
        onComplete={handleGitSetupComplete}
      />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* About Modal */}
      <AboutSettings isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
