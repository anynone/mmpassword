import { useState, useEffect } from "react"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { confirm } from "@tauri-apps/plugin-dialog"
import { FolderOpen } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { TopNavBar, SideNavBar, StatusBar, EntryList, EntryDetail } from "../layout"
import { GroupDialog } from "../group"
import { SettingsModal } from "../settings"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"
import type { Entry, Group } from "../../types"

interface MainScreenProps {
  onLock: () => void;
}

export function MainScreen({ onLock }: MainScreenProps) {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    subscriptionGroups,
    subscriptionSource,
    mergedEntries,
    isSubscriptionEntry,
  } = useVaultStore();

  const { showToast } = useToast();
  const { t } = useTranslation();

  // Load data
  useEffect(() => {
    loadData();
  }, [vault]);

  const loadData = async () => {
    await Promise.all([getEntries(), getGroups()]);
  };

  // Use merged entries (local + subscription)
  const allMergedEntries = mergedEntries();

  // Filter entries by selected group
  const filteredEntries = selectedGroupId
    ? allMergedEntries.filter((e) => e.groupId === selectedGroupId)
    : allMergedEntries;

  // Handle lock
  const handleLock = async () => {
    if (vault && useVaultStore.getState().isUnlocked) {
      await lockVault();
    } else {
      // Subscription-only mode: just clear subscription data
      useVaultStore.getState().clearSubscription();
    }
    onLock();
  };

  // Handle settings
  const handleSettings = () => {
    setIsSettingsOpen(true);
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
    : allMergedEntries.find((e) => e.id === selectedEntryId);

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Top Navigation Bar */}
      <TopNavBar onLock={handleLock} onSettings={handleSettings} />

      {/* Vault Tab Bar */}
      <div className="flex items-center bg-muted/50 px-4 border-b border-border/30 h-10 shrink-0">
        <div className="flex items-center bg-card px-4 h-full border-t-2 border-primary rounded-t-lg shadow-sm">
          <FolderOpen className="h-3.5 w-3.5 mr-2 text-primary" />
          <span className="text-xs font-semibold">
            {vault?.name || "Vault"}.mmp
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* SideNavBar - Groups */}
        <SideNavBar
          selectedGroupId={selectedGroupId}
          onSelectGroup={selectGroup}
          onCreateGroup={handleCreateGroup}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
          subscriptionGroups={subscriptionGroups}
          subscriptionSource={subscriptionSource ?? null}
        />

        {/* Entry List */}
        <EntryList
          entries={filteredEntries}
          selectedEntryId={selectedEntryId}
          onDeleteEntry={handleDeleteEntry}
          isSubscriptionEntry={isSubscriptionEntry}
        />

        {/* Entry Detail */}
        <EntryDetail
          entry={selectedEntry || null}
          onCopyField={handleCopyFieldFromDetail}
          isSubscription={selectedEntry ? isSubscriptionEntry(selectedEntry.id) : false}
        />
      </div>

      {/* Footer */}
      <StatusBar status="unlocked" version="0.1.0" />

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
    </div>
  );
}
