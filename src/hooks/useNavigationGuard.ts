import { useState, useCallback } from "react";
import { useVaultStore } from "../stores/vaultStore";

export interface NavigationGuardState {
  isOpen: boolean;
  isCreating: boolean;
}

export function useNavigationGuard() {
  const hasUnsavedChanges = useVaultStore((s) => s.hasUnsavedChanges);
  const editingState = useVaultStore((s) => s.editingState);
  const cancelEditing = useVaultStore((s) => s.cancelEditing);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const guardNavigation = useCallback(
    (action: () => void): boolean => {
      if (!hasUnsavedChanges()) {
        action();
        return true;
      }
      setPendingAction(() => action);
      setConfirmOpen(true);
      return false;
    },
    [hasUnsavedChanges]
  );

  const handleDiscard = useCallback(() => {
    setConfirmOpen(false);
    const action = pendingAction;
    setPendingAction(null);
    cancelEditing();
    action?.();
  }, [pendingAction, cancelEditing]);

  const handleSave = useCallback(() => {
    setConfirmOpen(false);
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }, [pendingAction]);

  const handleCancel = useCallback(() => {
    setConfirmOpen(false);
    setPendingAction(null);
  }, []);

  const isCreating = editingState.mode === "creating";

  return {
    confirmState: { isOpen: confirmOpen, isCreating } as NavigationGuardState,
    guardNavigation,
    handleDiscard,
    handleSave,
    handleCancel,
  };
}
