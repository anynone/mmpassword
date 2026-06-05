import { useEffect, useMemo, useRef, useState } from "react"
import { Lock, Settings, Info, RefreshCw, Search, SearchX, Folder } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { AppHeader } from "./AppHeader"
import { useTranslation } from "../../i18n"
import { useToast } from "../common/Toast"

interface TopNavBarProps {
  onLock: () => void
  onSettings: () => void
  onAbout: () => void
}

export function TopNavBar({ onLock, onSettings, onAbout }: TopNavBarProps) {
  const isUnlocked = useVaultStore((state) => state.isUnlocked)
  const entries = useVaultStore((state) => state.entries)
  const groups = useVaultStore((state) => state.groups)
  const selectEntry = useVaultStore((state) => state.selectEntry)
  const selectGroup = useVaultStore((state) => state.selectGroup)
  const isEditingActive = useVaultStore((state) => state.isEditingActive)
  const cancelEditing = useVaultStore((state) => state.cancelEditing)
  const saveCurrentEditing = useVaultStore((state) => state.saveCurrentEditing)
  const pullGitVault = useVaultStore((state) => state.pullGitVault)
  const isLoading = useVaultStore((state) => state.isLoading)
  const currentVaultTarget = useVaultStore((state) => state.currentVaultTarget)
  const canRefreshVault = currentVaultTarget?.type === "git"

  const { t } = useTranslation()
  const { showToast } = useToast()
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [globalSearchQuery, setGlobalSearchQuery] = useState("")

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    pendingAction: () => void
  }>({ isOpen: false, pendingAction: () => {} })

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups]
  )

  const searchResults = useMemo(() => {
    const query = globalSearchQuery.trim().toLowerCase()
    if (!query) return []

    return entries
      .map((entry) => {
        const groupName = entry.groupId ? groupNameById.get(entry.groupId) || "" : t("sideNav.allItems")
        const matchingField = entry.fields.find((field) =>
          String(field.name || "").toLowerCase().includes(query) ||
          String(field.value || "").toLowerCase().includes(query)
        )
        const matchedByTitle = entry.title.toLowerCase().includes(query)
        const matchedByGroup = groupName.toLowerCase().includes(query)
        const matchedByTags = (entry.tags || []).some((tag) => tag.toLowerCase().includes(query))

        if (!matchedByTitle && !matchedByGroup && !matchingField && !matchedByTags) {
          return null
        }

        let matchLabel = t("topNav.search.matchTitle")
        if (matchingField) {
          matchLabel = matchingField.name
            ? t("topNav.search.matchField", { field: matchingField.name })
            : t("topNav.search.matchFieldValue")
        } else if (matchedByGroup) {
          matchLabel = t("topNav.search.matchGroup", { group: groupName })
        } else if (matchedByTags) {
          matchLabel = t("topNav.search.matchTag")
        }

        return {
          entry,
          groupName,
          matchLabel,
        }
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .slice(0, 12)
  }, [entries, globalSearchQuery, groupNameById, t])

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
      return
    }
    setGlobalSearchQuery("")
  }, [isSearchOpen])

  useEffect(() => {
    if (!isSearchOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isSearchOpen])

  const guardAndNavigate = (action: () => void) => {
    if (isEditingActive()) {
      setConfirmState({ isOpen: true, pendingAction: action })
    } else {
      action()
    }
  }

  const handleSearchSubmit = () => {
    if (!globalSearchQuery.trim()) {
      searchInputRef.current?.focus()
      return
    }

    if (searchResults.length === 0) {
      showToast("info", t("topNav.search.noResults"))
    }
  }

  const handleSelectSearchResult = (entryId: string, groupId?: string) => {
    guardAndNavigate(() => {
      selectGroup(groupId || null)
      selectEntry(entryId)
      setIsSearchOpen(false)
    })
  }

  const handleRefresh = async () => {
    if (isEditingActive()) {
      setConfirmState({ isOpen: true, pendingAction: () => { pullGitVault() } })
    } else {
      await pullGitVault()
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
    if (saved) {
      action()
    }
  }

  const handleConfirmCancel = () => {
    setConfirmState({ isOpen: false, pendingAction: () => {} })
  }

  return (
    <>
      <AppHeader>
        {isUnlocked && (
          <div ref={searchRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              title={t("topNav.searchVault")}
              onClick={() => setIsSearchOpen((open) => !open)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {isSearchOpen && (
              <div className="absolute right-0 top-11 z-50 w-[380px] overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                <div className="p-3 border-b border-border/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={globalSearchQuery}
                      onChange={(event) => setGlobalSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSearchSubmit()
                        if (event.key === "Escape") setIsSearchOpen(false)
                      }}
                      placeholder={t("topNav.searchPlaceholder")}
                      className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="max-h-[360px] overflow-y-auto py-1">
                  {globalSearchQuery.trim() && searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                      <SearchX className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t("topNav.search.noResults")}</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(({ entry, groupName, matchLabel }) => (
                      <button
                        key={entry.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                        onClick={() => handleSelectSearchResult(entry.id, entry.groupId)}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Folder className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{entry.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {groupName} / {matchLabel}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {t("topNav.searchHint")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {isUnlocked && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            title={t("topNav.lockVault")}
            onClick={() => guardAndNavigate(onLock)}
          >
            <Lock className="h-5 w-5" />
          </Button>
        )}
        {isUnlocked && canRefreshVault && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            title={t("topNav.refreshVault")}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          title={t("topNav.settings")}
          onClick={() => guardAndNavigate(onSettings)}
        >
          <Settings className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          title={t("settings.about")}
          onClick={() => guardAndNavigate(onAbout)}
        >
          <Info className="h-5 w-5" />
        </Button>
      </AppHeader>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={t("confirm.unsavedChanges")}
        message={t("confirm.unsavedChangesMessage")}
        onDiscard={handleConfirmDiscard}
        onSave={handleConfirmSave}
        onCancel={handleConfirmCancel}
      />
    </>
  )
}
