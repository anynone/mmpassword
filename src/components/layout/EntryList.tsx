import { useState } from "react";
import type { Entry } from "../../types";
import { IconButton } from "../common/IconButton";

interface EntryListProps {
  entries: Entry[];
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onCreateEntry: () => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
  onCopyField: (entryId: string, fieldName: string) => void;
}

export function EntryList({
  entries,
  selectedEntryId,
  onSelectEntry,
  onCreateEntry,
  onEditEntry,
  onDeleteEntry,
  onCopyField,
}: EntryListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    entryId: string;
    x: number;
    y: number;
  } | null>(null);

  const filteredEntries = entries.filter((entry) =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContextMenu = (e: React.MouseEvent, entryId: string) => {
    e.preventDefault();
    setContextMenu({ entryId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleEdit = () => {
    if (contextMenu) {
      const entry = entries.find((e) => e.id === contextMenu.entryId);
      if (entry) onEditEntry(entry);
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu) {
      const entry = entries.find((e) => e.id === contextMenu.entryId);
      if (entry) onDeleteEntry(entry);
    }
    closeContextMenu();
  };

  const handleCopyUsername = () => {
    if (contextMenu) {
      onCopyField(contextMenu.entryId, "username");
    }
    closeContextMenu();
  };

  const handleCopyPassword = () => {
    if (contextMenu) {
      onCopyField(contextMenu.entryId, "password");
    }
    closeContextMenu();
  };

  const getEntryIcon = (entry: Entry) => {
    // Try to determine icon based on URL or title
    const url = entry.fields.find((f) => f.name === "url")?.value?.toLowerCase() || "";
    const title = entry.title.toLowerCase();

    if (url.includes("github") || title.includes("github")) return "code";
    if (url.includes("google") || title.includes("google")) return "mail";
    if (url.includes("twitter") || title.includes("twitter")) return "tag";
    if (url.includes("facebook") || title.includes("facebook")) return "group";
    if (url.includes("bank") || title.includes("bank")) return "account_balance";
    if (url.includes("amazon") || title.includes("amazon")) return "shopping_cart";
    return "key";
  };

  return (
    <div className="w-72 bg-surface-container-low flex flex-col border-r border-outline-variant/20">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-outline-variant/20">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
          Entries
        </span>
        <IconButton
          icon="add"
          size="sm"
          tooltip="New Entry"
          onClick={onCreateEntry}
        />
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <span className="material-symbols-outlined text-lg">search</span>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries..."
            className="w-full bg-surface-container-highest border-none rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 outline-none transition-all"
          />
        </div>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">
              {searchQuery ? "search_off" : "key"}
            </span>
            <p className="text-sm text-on-surface-variant">
              {searchQuery ? "No entries found" : "No entries yet"}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry.id)}
              onContextMenu={(e) => handleContextMenu(e, entry.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left
                transition-all duration-150 border-b border-outline-variant/10
                ${
                  selectedEntryId === entry.id
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface hover:bg-surface-container-high"
                }
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${selectedEntryId === entry.id ? "bg-primary/20" : "bg-surface-container-high"}
                `}
              >
                <span className="material-symbols-outlined text-lg">
                  {getEntryIcon(entry)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.title}</p>
                <p className="text-xs text-on-surface-variant truncate">
                  {entry.fields.find((f) => f.name === "username")?.value || "No username"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/20 py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleCopyUsername}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              Copy Username
            </button>
            <button
              onClick={handleCopyPassword}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              Copy Password
            </button>
            <div className="border-t border-outline-variant/20 my-1" />
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
    </div>
  );
}
