import { useState, useEffect } from "react"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { confirm } from "@tauri-apps/plugin-dialog"
import { listen } from "@tauri-apps/api/event"
import { useVaultStore } from "../../stores/vaultStore"
import { TopNavBar, SideNavBar, StatusBar, EntryList, EntryDetail } from "../layout"
import { GroupDialog } from "../group"
import { SettingsModal, AboutSettings } from "../settings"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"
import { useAutoLock } from "../../hooks/useAutoLock"
import type { Entry, Group } from "../../types"

interface MainScreenProps {
  onLock: () => void;
}

export function MainScreen({ onLock }: MainScreenProps) {
  // Auto-lock on idle
  useAutoLock();

  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const {
    vault,
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

  // Load data
  useEffect(() => {
    loadData();
  }, [vault]);

  // Listen to backend sync events so we can surface "syncing" status in the
  // footer while background git commit+push work runs.
  useEffect(() => {
    const unlistenPromises = [
      listen("sync:started", () => {
        useVaultStore.getState().notifySyncStarted();
      }),
      listen<string>("sync:failed", (event) => {
        useVaultStore.getState().notifySyncFailed(event.payload);
      }),
      listen("sync:completed", () => {
        useVaultStore.getState().notifySyncCompleted();
      }),
    ];
    return () => {
      unlistenPromises.forEach((p) => {
        p.then((unlisten) => unlisten()).catch(() => {});
      });
    };
  }, []);

  // Show a toast if a background sync fails so the user is informed.
  useEffect(() => {
    if (syncError) {
      showToast("error", t("sync.failed", { error: syncError }));
      useVaultStore.getState().clearSyncError();
    }
  }, [syncError, showToast, t]);

  const loadData = async () => {
    await Promise.all([getEntries(), getGroups()]);
  };

  // Filter entries by selected group
  const filteredEntries = selectedGroupId
    ? entries.filter((e) => e.groupId === selectedGroupId)
    : entries;

  // Handle lock
  const handleLock = async () => {
    await lockVault();
    onLock();
  };

  // Handle settings
  const handleSettings = () => {
    setIsSettingsOpen(true);
  };

  // Handle about
  const handleAbout = () => {
    setIsAboutOpen(true);
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
      <StatusBar status="unlocked" version="0.1.0" isSyncing={pendingSyncCount > 0} />

      {/* Group Dialog (still uses modal) */}
      <GroupDialog
        isOpen={isGroupDialogOpen}
        onClose={() => {
          setIsGroupDialogOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
      />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* About Modal */}
      <AboutSettings isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
