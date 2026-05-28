import { useState } from "react"
import { Lock, Settings, Info, RefreshCw } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { useSettingsStore } from "../../stores/settingsStore"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { AppHeader } from "./AppHeader"
import { useTranslation } from "../../i18n"

interface TopNavBarProps {
  onLock: () => void
  onSettings: () => void
  onAbout: () => void
}

export function TopNavBar({ onLock, onSettings, onAbout }: TopNavBarProps) {
  const isUnlocked = useVaultStore((state) => state.isUnlocked)
  const isEditingActive = useVaultStore((state) => state.isEditingActive)
  const cancelEditing = useVaultStore((state) => state.cancelEditing)
  const saveCurrentEditing = useVaultStore((state) => state.saveCurrentEditing)
  const pullGitVault = useVaultStore((state) => state.pullGitVault)
  const isLoading = useVaultStore((state) => state.isLoading)
  const lastGitVault = useSettingsStore((s) => s.lastGitVault)

  const { t } = useTranslation()

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    pendingAction: () => void
  }>({ isOpen: false, pendingAction: () => {} })

  const guardAndNavigate = (action: () => void) => {
    if (isEditingActive()) {
      setConfirmState({ isOpen: true, pendingAction: action })
    } else {
      action()
    }
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
        {isUnlocked && lastGitVault && (
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
