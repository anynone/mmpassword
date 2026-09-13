import { useEffect, useRef, useState } from "react"
import { Plus, Lock, FolderOpen, Github, FilePlus2, X } from "lucide-react"
import { useVaultStore, type VaultTab } from "../../stores/vaultStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { useTranslation } from "../../i18n"

export type AddVaultAction = "local" | "git" | "new"

interface VaultTabStripProps {
  /** Called when the user picks an option from the "+" menu */
  onAddVault: (action: AddVaultAction) => void
}

/**
 * Horizontal strip of open-vault tabs, rendered directly under the app
 * header. Clicking a tab switches the active vault; clicking a locked tab
 * switches to it and lets the app show the unlock screen; the "+" button
 * opens the add-vault menu (local file / Git repo / new vault).
 */
export function VaultTabStrip({ onAddVault }: VaultTabStripProps) {
  const tabs = useVaultStore((s) => s.tabs)
  const activeVaultId = useVaultStore((s) => s.activeVaultId)
  const switchVault = useVaultStore((s) => s.switchVault)
  const closeVault = useVaultStore((s) => s.closeVault)
  const isEditingActive = useVaultStore((s) => s.isEditingActive)
  const cancelEditing = useVaultStore((s) => s.cancelEditing)
  const saveCurrentEditing = useVaultStore((s) => s.saveCurrentEditing)

  const { t } = useTranslation()

  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)

  const openMenu = () => {
    const rect = menuButtonRef.current?.getBoundingClientRect()
    if (!rect) return
    const MENU_WIDTH = 224 // w-56
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - MENU_WIDTH - 8)
    setMenuPos({ top: rect.bottom + 6, left })
    setIsMenuOpen(true)
  }
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    pendingAction: () => void
  }>({ isOpen: false, pendingAction: () => {} })

  // Close the "+" menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isMenuOpen])

  const guardAndRun = (action: () => void) => {
    if (isEditingActive()) {
      setConfirmState({ isOpen: true, pendingAction: action })
    } else {
      action()
    }
  }

  const handleTabClick = (tab: VaultTab) => {
    if (tab.vaultId === activeVaultId) return
    guardAndRun(() => switchVault(tab.vaultId))
  }

  const handleCloseClick = (event: React.MouseEvent, tab: VaultTab) => {
    event.stopPropagation()
    guardAndRun(() => {
      closeVault(tab.vaultId)
    })
  }

  const handleMenuSelect = (action: AddVaultAction) => {
    setIsMenuOpen(false)
    onAddVault(action)
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
    if (saved) {
      action()
    }
  }

  const handleConfirmCancel = () => {
    setConfirmState({ isOpen: false, pendingAction: () => {} })
  }

  if (tabs.length === 0) return null

  return (
    <div className="flex items-end gap-1 px-4 pt-1 bg-background/95 border-b border-border/30 shrink-0">
      {/* Scrollable tabs (kept in an inner scroller so the "+" dropdown is
          never clipped by the overflow container) */}
      <div className="flex items-end gap-1 min-w-0 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.vaultId === activeVaultId
          const isLocked = tab.status === "locked"
          return (
            <div
              key={tab.vaultId}
              role="button"
              tabIndex={0}
              onClick={() => handleTabClick(tab)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleTabClick(tab)
              }}
              title={
                tab.target.type === "git"
                  ? `${tab.target.vault.repoName}:${tab.target.vault.vaultPath}`
                  : tab.target.path
              }
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-sm cursor-pointer select-none border border-b-0 transition-colors max-w-[220px] shrink-0",
                isActive
                  ? "bg-card border-border font-semibold text-foreground"
                  : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                isLocked && "opacity-70"
              )}
            >
              {tab.target.type === "git" ? (
                <Github className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{tab.name}</span>
              {isLocked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
              <button
                type="button"
                onClick={(e) => handleCloseClick(e, tab)}
                title={t("vaultTabs.closeTab")}
                className="ml-0.5 rounded p-0.5 text-muted-foreground/60 hover:bg-foreground/10 hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add vault */}
      <div ref={menuRef} className="relative py-1.5 shrink-0">
        <Button
          ref={menuButtonRef}
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full shrink-0"
          title={t("vaultTabs.addVault")}
          onClick={() => (isMenuOpen ? setIsMenuOpen(false) : openMenu())}
        >
          <Plus className="h-4 w-4" />
        </Button>

        {isMenuOpen && menuPos && (
          <div
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
            className="z-50 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              onClick={() => handleMenuSelect("local")}
            >
              <FolderOpen className="h-4 w-4 text-primary" />
              <span>{t("vaultTabs.openLocal")}</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              onClick={() => handleMenuSelect("git")}
            >
              <Github className="h-4 w-4 text-primary" />
              <span>{t("vaultTabs.connectGit")}</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              onClick={() => handleMenuSelect("new")}
            >
              <FilePlus2 className="h-4 w-4 text-primary" />
              <span>{t("vaultTabs.createNew")}</span>
            </button>
          </div>
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
