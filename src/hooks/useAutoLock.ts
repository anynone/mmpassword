import { useEffect, useRef, useCallback } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { useVaultStore } from "../stores/vaultStore";

/**
 * Monitors user activity and automatically locks the vault after
 * the configured idle timeout (autoLockMinutes).
 */
export function useAutoLock() {
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const lockVault = useVaultStore((s) => s.lockVault);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const timeoutMs = autoLockMinutes * 60 * 1000;
    timerRef.current = setTimeout(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= timeoutMs - 500) {
        lockVault();
      }
    }, timeoutMs);
  }, [autoLockMinutes, lockVault]);

  // Only set up listeners when vault is unlocked
  useEffect(() => {
    if (!isUnlocked) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart"] as const;
    const handler = () => resetTimer();

    for (const event of events) {
      window.addEventListener(event, handler, { passive: true });
    }

    // Start the initial timer
    resetTimer();

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      for (const event of events) {
        window.removeEventListener(event, handler);
      }
    };
  }, [isUnlocked, resetTimer]);
}
