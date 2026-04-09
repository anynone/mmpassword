import { useState } from "react"
import { LayoutGrid, Folder, Rss, Lock, Plus, Pencil, Trash2 } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"
import { cn } from "@/lib/utils"
import type { Group } from "../../types"

interface SideNavBarProps {
  selectedGroupId: string | null
  onSelectGroup: (groupId: string | null) => void
  onCreateGroup: () => void
  onEditGroup: (group: Group) => void
  onDeleteGroup: (group: Group) => void
  subscriptionGroups?: Group[]
  subscriptionSource?: string | null
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
  const groups = useVaultStore((s) => s.groups)
  const isEditingActive = useVaultStore((s) => s.isEditingActive)
  const cancelEditing = useVaultStore((s) => s.cancelEditing)
  const saveCurrentEditing = useVaultStore((s) => s.saveCurrentEditing)
  const moveEntryToGroup = useVaultStore((s) => s.moveEntryToGroup)
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [dragOverGroupId, setDragOverGroupId] = useState<string | null | undefined>(undefined)

  const handleDragOver = (e: React.DragEvent, groupId: string | null) => {
    if (e.dataTransfer.types.includes("application/entry-id")) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setDragOverGroupId(groupId)
    }
  }

  const handleDragLeave = () => {
    setDragOverGroupId(undefined)
  }

  const handleDrop = async (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault()
    setDragOverGroupId(undefined)
    const entryId = e.dataTransfer.getData("application/entry-id")
    if (!entryId) return
    try {
      await moveEntryToGroup(entryId, groupId)
      showToast("success", t("entryList.movedToGroup"))
    } catch (error) {
      showToast("error", String(error))
    }
  }

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    pendingAction: () => void
  }>({ isOpen: false, pendingAction: () => {} })

  const handleSelectGroup = (groupId: string | null) => {
    if (isEditingActive()) {
      setConfirmState({ isOpen: true, pendingAction: () => performGroupSelect(groupId) })
    } else {
      performGroupSelect(groupId)
    }
  }

  const performGroupSelect = (groupId: string | null) => {
    cancelEditing()
    onSelectGroup(groupId)
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

  const groupItemClasses = (isActive: boolean) =>
    cn(
      "w-full flex items-center gap-3 px-4 py-2 text-left transition-all duration-150",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent"
    )

  return (
    <aside className="w-56 shrink-0 bg-muted/30 flex flex-col border-r border-border/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          {t("sideNav.groups")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          title={t("sideNav.newGroup")}
          onClick={onCreateGroup}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Group List */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
        <button
          onClick={() => handleSelectGroup(null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={cn(
            groupItemClasses(selectedGroupId === null),
            dragOverGroupId === null && "ring-2 ring-primary/50 bg-primary/5"
          )}
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-sm font-medium">{t("sideNav.allItems")}</span>
        </button>

        {groups.map((group) => (
          <ContextMenu key={group.id}>
            <ContextMenuTrigger asChild>
              <button
                onClick={() => handleSelectGroup(group.id)}
                onDragOver={(e) => handleDragOver(e, group.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, group.id)}
                className={cn(
                  groupItemClasses(selectedGroupId === group.id),
                  dragOverGroupId === group.id && "ring-2 ring-primary/50 bg-primary/5"
                )}
              >
                <Folder className="h-5 w-5" />
                <span className="text-sm font-medium truncate">{group.name}</span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-[140px]">
              <ContextMenuItem onClick={() => onEditGroup(group)}>
                <Pencil className="h-4 w-4 mr-3" />
                {t("sideNav.edit")}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onDeleteGroup(group)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                {t("sideNav.delete")}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}

        {subscriptionGroups.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-4 py-2 mt-3 mb-1">
              <Rss className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("subscription.subscriptionGroup")}
              </span>
            </div>
            {subscriptionGroups.map((group) => (
              <button
                key={`sub-${group.id}`}
                onClick={() => handleSelectGroup(group.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-left transition-all duration-150",
                  selectedGroupId === group.id
                    ? "bg-secondary/30 text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Folder className="h-5 w-5" />
                <span className="text-sm font-medium truncate">{group.name}</span>
                <Lock className="h-3 w-3 text-muted-foreground ml-auto" />
              </button>
            ))}
          </>
        )}
      </nav>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={t("confirm.unsavedChanges")}
        message={t("confirm.unsavedChangesMessage")}
        onDiscard={handleConfirmDiscard}
        onSave={handleConfirmSave}
        onCancel={handleConfirmCancel}
      />
    </aside>
  )
}
