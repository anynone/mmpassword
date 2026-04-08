import { useState } from "react"
import { Lock, Settings } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { AppHeader } from "./AppHeader"
import { useTranslation } from "../../i18n"

interface TopNavBarProps {
  onLock: () => void
  onSettings: () => void
}

export function TopNavBar({ onLock, onSettings }: TopNavBarProps) {
  const vault = useVaultStore((state) => state.vault)
  const isUnlocked = useVaultStore((state) => state.isUnlocked)
  const subscriptionSource = useVaultStore((state) => state.subscriptionSource)
  const isEditingActive = useVaultStore((state) => state.isEditingActive)
  const cancelEditing = useVaultStore((state) => state.cancelEditing)
  const saveCurrentEditing = useVaultStore((state) => state.saveCurrentEditing)

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
        {vault && isUnlocked && (
          <span className="mr-auto ml-4 text-sm text-muted-foreground">
            {vault.name}
          </span>
        )}
        {(isUnlocked || subscriptionSource) && (
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
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          title={t("topNav.settings")}
          onClick={() => guardAndNavigate(onSettings)}
        >
          <Settings className="h-5 w-5" />
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
