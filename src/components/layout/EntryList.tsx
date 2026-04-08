import { useState, useRef, useEffect } from "react"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { Search, Plus, Key, Lock, Copy, Pencil, Trash2, Code, Mail, Tag, Users, Landmark, ShoppingCart, SearchX, Type } from "lucide-react"
import type { Entry } from "../../types"
import { useVaultStore } from "../../stores/vaultStore"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"
import { cn } from "@/lib/utils"

interface EntryListProps {
  entries: Entry[]
  selectedEntryId: string | null
  onDeleteEntry: (entry: Entry) => void
  isSubscriptionEntry?: (entryId: string) => boolean
}

export function EntryList({
  entries,
  selectedEntryId,
  onDeleteEntry,
  isSubscriptionEntry: isSubscriptionEntryProp,
}: EntryListProps) {
  const { startEditing, startCreating, selectEntry, cancelEditing, isEditingActive, saveCurrentEditing, virtualEntry, isSubscriptionEntry: isSubscriptionEntryStore, renameEntry } = useVaultStore()
  const { showToast } = useToast()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState("")
  const [renamingEntryId, setRenamingEntryId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    pendingAction: () => void
  }>({ isOpen: false, pendingAction: () => {} })

  const filteredEntries = entries.filter((entry) =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const guardAndNavigate = (action: () => void) => {
    if (isEditingActive()) {
      setConfirmState({ isOpen: true, pendingAction: action })
    } else {
      action()
    }
  }

  const handleConfirmDiscard = () => {
    const action = confirmState.pendingAction
    setConfirmState({ isOpen: false, pendingAction: () => {} })
    cancelEditing()
    action()
  }

  const handleConfirmSave = async () => {
    const action = confirmState.pendingAction
    setConfirmState({ isOpen: false, pendingAction: () => {} })
    const saved = await saveCurrentEditing()
    if (saved) action()
  }

  const handleConfirmCancel = () => {
    setConfirmState({ isOpen: false, pendingAction: () => {} })
  }

  const handleSelectEntry = (entryId: string) => {
    guardAndNavigate(() => selectEntry(entryId))
  }

  const handleCreateEntry = () => {
    const currentGroupId = useVaultStore.getState().selectedGroupId
    if (currentGroupId) {
      const subscriptionGroupIds = useVaultStore.getState().subscriptionGroups.map(g => g.id)
      if (subscriptionGroupIds.includes(currentGroupId)) {
        showToast("info", t("subscription.cannotModify"))
        return
      }
    }
    guardAndNavigate(() => startCreating(currentGroupId || undefined))
  }

  const handleCopyUsername = async (entry: Entry) => {
    const field = entry.fields.find((f) => f.name.toLowerCase() === "username")
    if (field?.value) {
      await writeText(field.value)
      showToast("success", t("entryList.usernameCopied"))
    }
  }

  const handleCopyPassword = async (entry: Entry) => {
    const field = entry.fields.find((f) => f.name.toLowerCase() === "password")
    if (field?.value) {
      await writeText(field.value)
      showToast("success", t("entryList.passwordCopied"))
    }
  }

  const handleEdit = (entry: Entry, isSub: boolean) => {
    if (isSub) {
      showToast("info", t("subscription.cannotModify"))
    } else {
      guardAndNavigate(() => startEditing(entry))
    }
  }

  const handleDelete = (entry: Entry, isSub: boolean) => {
    if (isSub) {
      showToast("info", t("subscription.cannotModify"))
    } else {
      onDeleteEntry(entry)
    }
  }

  const handleStartRename = (entry: Entry, isSub: boolean) => {
    if (isSub) {
      showToast("info", t("subscription.cannotModify"))
      return
    }
    setRenamingEntryId(entry.id)
    setRenameValue(entry.title)
  }

  const handleFinishRename = async () => {
    if (!renamingEntryId || !renameValue.trim()) {
      setRenamingEntryId(null)
      return
    }
    try {
      await renameEntry(renamingEntryId, renameValue.trim())
      showToast("success", t("entryDetail.entryUpdated"))
    } catch (error) {
      showToast("error", String(error))
    }
    setRenamingEntryId(null)
  }

  useEffect(() => {
    if (renamingEntryId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingEntryId])

  const getEntryIcon = (entry: Entry) => {
    const url = entry.fields.find((f) => f.name === "url")?.value?.toLowerCase() || ""
    const title = entry.title.toLowerCase()

    if (url.includes("github") || title.includes("github")) return Code
    if (url.includes("google") || title.includes("google")) return Mail
    if (url.includes("twitter") || title.includes("twitter")) return Tag
    if (url.includes("facebook") || title.includes("facebook")) return Users
    if (url.includes("bank") || title.includes("bank")) return Landmark
    if (url.includes("amazon") || title.includes("amazon")) return ShoppingCart
    return Key
  }

  return (
    <div className="w-72 bg-muted/20 flex flex-col border-r border-border/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          {t("entryList.entries")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          title={t("entryList.newEntry")}
          onClick={handleCreateEntry}
        >
          <Plus className="h-4 w-4 text-primary" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("entryList.search")}
            className="w-full bg-accent border-none rounded-lg pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/40 outline-none transition-all"
          />
        </div>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {virtualEntry && (
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-border/30 bg-primary/5 border-l-2 border-l-primary"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/20">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium italic text-primary">{t("entryList.newEntry")}</p>
              <p className="text-xs text-muted-foreground italic">{t("entryList.editing")}</p>
            </div>
          </button>
        )}

        {filteredEntries.length === 0 && !virtualEntry ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            {searchQuery ? (
              <SearchX className="h-8 w-8 text-muted-foreground mb-2" />
            ) : (
              <Key className="h-8 w-8 text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground">
              {searchQuery ? t("entryList.noEntriesFound") : t("entryList.noEntriesYet")}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSub = isSubscriptionEntryProp ? isSubscriptionEntryProp(entry.id) : isSubscriptionEntryStore(entry.id)
            const EntryIcon = getEntryIcon(entry)
            return (
              <ContextMenu key={entry.id}>
                <ContextMenuTrigger asChild>
                  <button
                    onClick={() => handleSelectEntry(entry.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-border/30",
                      selectedEntryId === entry.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent",
                      isSub && "opacity-80"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        selectedEntryId === entry.id ? "bg-primary/20" : isSub ? "bg-secondary/30" : "bg-accent"
                      )}
                    >
                      <EntryIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {renamingEntryId === entry.id ? (
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleFinishRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFinishRename()
                              if (e.key === "Escape") setRenamingEntryId(null)
                            }}
                            className="text-sm font-medium bg-background border border-primary/40 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/40 w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="text-sm font-medium truncate">{entry.title}</p>
                        )}
                        {isSub && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.fields.find((f) => f.name === "username")?.value || t("entryList.noUsername")}
                      </p>
                    </div>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-[160px]">
                  <ContextMenuItem onClick={() => handleCopyUsername(entry)}>
                    <Copy className="h-4 w-4 mr-3" />
                    {t("entryList.copyUsername")}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleCopyPassword(entry)}>
                    <Copy className="h-4 w-4 mr-3" />
                    {t("entryList.copyPassword")}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleEdit(entry, isSub)}>
                    <Pencil className="h-4 w-4 mr-3" />
                    {t("sideNav.edit")}
                  </ContextMenuItem>
                  {!isSub && (
                    <ContextMenuItem onClick={() => handleStartRename(entry, isSub)}>
                      <Type className="h-4 w-4 mr-3" />
                      {t("entryList.rename")}
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem
                    onClick={() => handleDelete(entry, isSub)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    {t("sideNav.delete")}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={t("confirm.unsavedChanges")}
        message={t("confirm.unsavedChangesMessage")}
        onDiscard={handleConfirmDiscard}
        onSave={handleConfirmSave}
        onCancel={handleConfirmCancel}
      />
    </div>
  )
}
