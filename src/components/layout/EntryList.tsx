import { useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { Entry } from "../../types";
import { useVaultStore } from "../../stores/vaultStore";
import { IconButton } from "../common/IconButton";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { useToast } from "../common/Toast";
import { useTranslation } from "../../i18n";

interface EntryListProps {
  entries: Entry[];
  selectedEntryId: string | null;
  onDeleteEntry: (entry: Entry) => void;
  isSubscriptionEntry?: (entryId: string) => boolean;
}

export function EntryList({
  entries,
  selectedEntryId,
  onDeleteEntry,
  isSubscriptionEntry: isSubscriptionEntryProp,
}: EntryListProps) {
  const { startEditing, startCreating, selectEntry, cancelEditing, isEditingActive, saveCurrentEditing, virtualEntry, isSubscriptionEntry: isSubscriptionEntryStore } = useVaultStore();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    entryId: string;
    x: number;
    y: number;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    pendingAction: () => void;
  }>({ isOpen: false, pendingAction: () => {} });

  const filteredEntries = entries.filter((entry) =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Guard navigation - check for editing state before navigating
  const guardAndNavigate = (action: () => void) => {
    if (isEditingActive()) {
      setConfirmState({ isOpen: true, pendingAction: action });
    } else {
      action();
    }
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

  const handleSelectEntry = (entryId: string) => {
    guardAndNavigate(() => selectEntry(entryId));
  };

  const handleCreateEntry = () => {
    // Check if selected group is a subscription group
    const currentGroupId = useVaultStore.getState().selectedGroupId;
    if (currentGroupId) {
      // Check if the group is from subscription
      const subscriptionGroupIds = useVaultStore.getState().subscriptionGroups.map(g => g.id);
      if (subscriptionGroupIds.includes(currentGroupId)) {
        showToast("info", t("subscription.cannotModify"));
        return;
      }
    }
    guardAndNavigate(() => startCreating(currentGroupId || undefined));
  };

  const handleContextMenu = (e: React.MouseEvent, entryId: string) => {
    e.preventDefault();
    setContextMenu({ entryId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleEdit = () => {
    if (contextMenu) {
      const entry = entries.find((e) => e.id === contextMenu.entryId);
      if (entry) {
        // Check if it's a subscription entry
        const isSub = isSubscriptionEntryProp ? isSubscriptionEntryProp(entry.id) : isSubscriptionEntryStore(entry.id);
        if (isSub) {
          showToast("info", t("subscription.cannotModify"));
        } else {
          guardAndNavigate(() => startEditing(entry));
        }
      }
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu) {
      const entry = entries.find((e) => e.id === contextMenu.entryId);
      if (entry) {
        // Check if it's a subscription entry
        const isSub = isSubscriptionEntryProp ? isSubscriptionEntryProp(entry.id) : isSubscriptionEntryStore(entry.id);
        if (isSub) {
          showToast("info", t("subscription.cannotModify"));
        } else {
          onDeleteEntry(entry);
        }
      }
    }
    closeContextMenu();
  };

  const handleCopyUsername = async () => {
    if (contextMenu) {
      const entry = entries.find((e) => e.id === contextMenu.entryId);
      const field = entry?.fields.find((f) => f.name.toLowerCase() === "username");
      if (field?.value) {
        await writeText(field.value);
        showToast("success", t("entryList.usernameCopied"));
      }
    }
    closeContextMenu();
  };

  const handleCopyPassword = async () => {
    if (contextMenu) {
      const entry = entries.find((e) => e.id === contextMenu.entryId);
      const field = entry?.fields.find((f) => f.name.toLowerCase() === "password");
      if (field?.value) {
        await writeText(field.value);
        showToast("success", t("entryList.passwordCopied"));
      }
    }
    closeContextMenu();
  };

  const getEntryIcon = (entry: Entry) => {
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
          {t("entryList.entries")}
        </span>
        <IconButton
          icon="add"
          size="sm"
          tooltip={t("entryList.newEntry")}
          onClick={handleCreateEntry}
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
            placeholder={t("entryList.search")}
            className="w-full bg-surface-container-highest border-none rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 outline-none transition-all"
          />
        </div>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Virtual entry placeholder (for creating mode) */}
        {virtualEntry && (
          <button
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-left
              transition-all duration-150 border-b border-outline-variant/10
              bg-primary-container/50 border-l-2 border-l-primary
            `}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/20">
              <span className="material-symbols-outlined text-lg text-primary">add</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium italic text-primary">{t("entryList.newEntry")}</p>
              <p className="text-xs text-on-surface-variant italic">{t("entryList.editing")}</p>
            </div>
          </button>
        )}

        {filteredEntries.length === 0 && !virtualEntry ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">
              {searchQuery ? "search_off" : "key"}
            </span>
            <p className="text-sm text-on-surface-variant">
              {searchQuery ? t("entryList.noEntriesFound") : t("entryList.noEntriesYet")}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSub = isSubscriptionEntryProp ? isSubscriptionEntryProp(entry.id) : isSubscriptionEntryStore(entry.id);
            return (
            <button
              key={entry.id}
              onClick={() => handleSelectEntry(entry.id)}
              onContextMenu={(e) => handleContextMenu(e, entry.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left
                transition-all duration-150 border-b border-outline-variant/10
                ${
                  selectedEntryId === entry.id
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface hover:bg-surface-container-high"
                }
                ${isSub ? "opacity-80" : ""}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${selectedEntryId === entry.id ? "bg-primary/20" : isSub ? "bg-tertiary-container" : "bg-surface-container-high"}
                `}
              >
                <span className={`material-symbols-outlined text-lg ${isSub ? "text-on-tertiary-container" : ""}`}>
                  {getEntryIcon(entry)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  {isSub && (
                    <span className="material-symbols-outlined text-xs text-on-surface-variant" title={t("subscription.readOnly")}>lock</span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant truncate">
                  {entry.fields.find((f) => f.name === "username")?.value || t("entryList.noUsername")}
                </p>
              </div>
            </button>
            );
          })
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
              {t("entryList.copyUsername")}
            </button>
            <button
              onClick={handleCopyPassword}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              {t("entryList.copyPassword")}
            </button>
            <div className="border-t border-outline-variant/20 my-1" />
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
    </div>
  );
}
