import { useState } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { IconButton } from "../common/IconButton";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { useTranslation } from "../../i18n";
import type { Group } from "../../types";

interface SideNavBarProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
  subscriptionGroups?: Group[];
  subscriptionSource?: string | null;
}

export function SideNavBar({
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  subscriptionGroups = [],
  subscriptionSource: _subscriptionSource,
}: SideNavBarProps) {
  const groups = useVaultStore((s) => s.groups);
  const isEditingActive = useVaultStore((s) => s.isEditingActive);
  const cancelEditing = useVaultStore((s) => s.cancelEditing);
  const saveCurrentEditing = useVaultStore((s) => s.saveCurrentEditing);
  const { t } = useTranslation();

  const [contextMenu, setContextMenu] = useState<{
    groupId: string;
    x: number;
    y: number;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    pendingAction: () => void;
  }>({ isOpen: false, pendingAction: () => {} });

  const handleContextMenu = (e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    setContextMenu({ groupId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleEdit = () => {
    if (contextMenu) {
      const group = groups.find((g) => g.id === contextMenu.groupId);
      if (group) onEditGroup(group);
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu) {
      const group = groups.find((g) => g.id === contextMenu.groupId);
      if (group) onDeleteGroup(group);
    }
    closeContextMenu();
  };

  const getGroupIcon = (iconName: string | undefined) => {
    return iconName || "folder";
  };

  const handleSelectGroup = (groupId: string | null) => {
    if (isEditingActive()) {
      setConfirmState({ isOpen: true, pendingAction: () => performGroupSelect(groupId) });
    } else {
      performGroupSelect(groupId);
    }
  };

  const performGroupSelect = (groupId: string | null) => {
    cancelEditing();
    onSelectGroup(groupId);
  };

  const handleConfirmDiscard = () => {
    const action = confirmState.pendingAction;
    setConfirmState({ isOpen: false, pendingAction: () => {} });
    cancelEditing();
    action();
  };

  const handleConfirmSave = async () => {
    const action = confirmState.pendingAction;
    setConfirmState({ isOpen: false, pendingAction: () => {} });
    const saved = await saveCurrentEditing();
    if (saved) {
      action();
    }
  };

  const handleConfirmCancel = () => {
    setConfirmState({ isOpen: false, pendingAction: () => {} });
  };

  return (
    <aside className="w-56 bg-surface-container flex flex-col border-r border-outline-variant/20">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-outline-variant/20">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
          {t("sideNav.groups")}
        </span>
        <IconButton
          icon="add"
          size="sm"
          tooltip={t("sideNav.newGroup")}
          onClick={onCreateGroup}
        />
      </div>

      {/* Group List */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {/* All Items */}
        <button
          onClick={() => handleSelectGroup(null)}
          className={`
            w-full flex items-center gap-3 px-4 py-2 text-left
            transition-all duration-150
            ${
              selectedGroupId === null
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }
          `}
        >
          <span className="material-symbols-outlined text-xl">apps</span>
          <span className="text-sm font-medium">{t("sideNav.allItems")}</span>
        </button>

        {/* Groups */}
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleSelectGroup(group.id)}
            onContextMenu={(e) => handleContextMenu(e, group.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-2 text-left
              transition-all duration-150
              ${
                selectedGroupId === group.id
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }
            `}
          >
            <span className="material-symbols-outlined text-xl">
              {getGroupIcon(group.icon)}
            </span>
            <span className="text-sm font-medium truncate">{group.name}</span>
          </button>
        ))}

        {/* Subscription Groups */}
        {subscriptionGroups.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-4 py-2 mt-3 mb-1">
              <span className="material-symbols-outlined text-xs text-on-surface-variant">rss_feed</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                {t("subscription.subscriptionGroup")}
              </span>
            </div>
            {subscriptionGroups.map((group) => (
              <button
                key={`sub-${group.id}`}
                onClick={() => handleSelectGroup(group.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 text-left
                  transition-all duration-150
                  ${
                    selectedGroupId === group.id
                      ? "bg-tertiary-container text-on-tertiary-container"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }
                `}
              >
                <span className="material-symbols-outlined text-xl text-on-tertiary-container">
                  {getGroupIcon(group.icon)}
                </span>
                <span className="text-sm font-medium truncate">{group.name}</span>
                <span className="material-symbols-outlined text-xs text-on-surface-variant ml-auto">lock</span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/20 py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleEdit}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              {t("sideNav.edit")}
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-error hover:bg-error-container/20"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              {t("sideNav.delete")}
            </button>
          </div>
        </>
      )}

      {/* Unsaved Changes Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={t("confirm.unsavedChanges")}
        message={t("confirm.unsavedChangesMessage")}
        onDiscard={handleConfirmDiscard}
        onSave={handleConfirmSave}
        onCancel={handleConfirmCancel}
      />
    </aside>
  );
}
