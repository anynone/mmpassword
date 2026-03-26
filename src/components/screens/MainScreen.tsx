import { useState, useEffect } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useVaultStore } from "../../stores/vaultStore";
import { TopNavBar, SideNavBar, StatusBar, EntryList, EntryDetail } from "../layout";
import { EntryEditForm } from "../entry";
import { GroupDialog } from "../group";
import { useToast } from "../common/Toast";
import type { Entry, Group } from "../../types";

interface MainScreenProps {
  onLock: () => void;
}

export function MainScreen({ onLock }: MainScreenProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const {
    vault,
    entries,
    selectedEntryId,
    selectedGroupId,
    selectEntry,
    selectGroup,
    getEntries,
    getGroups,
    deleteEntry,
    deleteGroup,
    lockVault,
  } = useVaultStore();

  const { showToast } = useToast();

  // Load data
  useEffect(() => {
    loadData();
  }, [vault]);

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
    // TODO: Open settings modal
    showToast("info", "Settings coming soon");
  };

  // Entry actions
  const handleCreateEntry = () => {
    setEditingEntry(null);
    setIsEditModalOpen(true);
  };

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleDeleteEntry = async (entry: Entry) => {
    const confirmed = await confirm(`Delete "${entry.title}"?`, {
      title: "Delete Entry",
      kind: "warning",
    });
    if (confirmed) {
      await deleteEntry(entry.id);
      showToast("success", "Entry deleted");
    }
  };

  const handleCopyField = async (entryId: string, fieldName: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    const field = entry.fields.find(
      (f) => f.name.toLowerCase() === fieldName.toLowerCase()
    );
    if (field?.value) {
      await writeText(field.value);
      showToast("success", `${fieldName} copied to clipboard`);
    }
  };

  const handleCopyFieldFromDetail = async (fieldName: string, value: string) => {
    await writeText(value);
    showToast("success", `${fieldName} copied to clipboard`);
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
      `Delete group "${group.name}"? Entries will be moved to root.`,
      {
        title: "Delete Group",
        kind: "warning",
      }
    );
    if (confirmed) {
      await deleteGroup(group.id);
      showToast("success", "Group deleted");
    }
  };

  // Get selected entry
  const selectedEntry = entries.find((e) => e.id === selectedEntryId);

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Top Navigation Bar */}
      <TopNavBar onLock={handleLock} onSettings={handleSettings} />

      {/* Vault Tab Bar */}
      <div className="flex items-center bg-surface-container-low px-4 border-b border-surface-variant/20 h-10 shrink-0">
        <div className="flex items-center bg-surface-container-lowest px-4 h-full border-t-2 border-primary rounded-t-lg shadow-sm">
          <span className="material-symbols-outlined text-sm mr-2 text-primary">folder_open</span>
          <span className="text-xs font-semibold text-on-surface">
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
        />

        {/* Entry List */}
        <EntryList
          entries={filteredEntries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={selectEntry}
          onCreateEntry={handleCreateEntry}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onCopyField={handleCopyField}
        />

        {/* Entry Detail */}
        <EntryDetail
          entry={selectedEntry || null}
          onEdit={handleEditEntry}
          onCopyField={handleCopyFieldFromDetail}
        />
      </div>

      {/* Footer */}
      <StatusBar status="unlocked" version="0.1.0" />

      {/* Modals */}
      <EntryEditForm
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
        defaultGroupId={selectedGroupId || undefined}
      />

      <GroupDialog
        isOpen={isGroupDialogOpen}
        onClose={() => {
          setIsGroupDialogOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
      />
    </div>
  );
}
