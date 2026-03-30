import { useState } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { IconButton } from "../common/IconButton";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface TopNavBarProps {
  onLock: () => void;
  onSettings: () => void;
}

export function TopNavBar({ onLock, onSettings }: TopNavBarProps) {
  const vault = useVaultStore((state) => state.vault);
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const isEditingActive = useVaultStore((state) => state.isEditingActive);
  const cancelEditing = useVaultStore((state) => state.cancelEditing);
  const saveCurrentEditing = useVaultStore((state) => state.saveCurrentEditing);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    pendingAction: () => void;
  }>({ isOpen: false, pendingAction: () => {} });

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

  return (
    <header className="flex items-center justify-between px-6 py-2 bg-surface/80 backdrop-blur-xl border-b border-surface-container-high/30">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-2xl">lock</span>
        <span className="text-lg font-headline font-extrabold tracking-tight text-on-surface">
          mmpassword
        </span>
        {vault && isUnlocked && (
          <span className="ml-4 text-sm text-on-surface-variant">
            {vault.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isUnlocked && (
          <IconButton
            icon="lock"
            tooltip="Lock Vault"
            onClick={() => guardAndNavigate(onLock)}
          />
        )}
        <IconButton
          icon="settings"
          tooltip="Settings"
          onClick={() => guardAndNavigate(onSettings)}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title="Unsaved Changes"
        message="You have unsaved changes. Do you want to save them before leaving?"
        onDiscard={handleConfirmDiscard}
        onSave={handleConfirmSave}
        onCancel={handleConfirmCancel}
      />
    </header>
  );
}
