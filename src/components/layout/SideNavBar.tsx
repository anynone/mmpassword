import { useState } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { IconButton } from "../common/IconButton";
import type { Group } from "../../types";

interface SideNavBarProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}

export function SideNavBar({
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
}: SideNavBarProps) {
  const groups = useVaultStore((state) => state.groups);
  const [contextMenu, setContextMenu] = useState<{
    groupId: string;
    x: number;
    y: number;
  } | null>(null);

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

  return (
    <aside className="w-56 bg-surface-container flex flex-col border-r border-outline-variant/20">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-outline-variant/20">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
          Groups
        </span>
        <IconButton
          icon="add"
          size="sm"
          tooltip="New Group"
          onClick={onCreateGroup}
        />
      </div>

      {/* Group List */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {/* All Items */}
        <button
          onClick={() => onSelectGroup(null)}
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
          <span className="text-sm font-medium">All Items</span>
        </button>

        {/* Groups */}
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
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
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-error hover:bg-error-container/20"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              Delete
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
