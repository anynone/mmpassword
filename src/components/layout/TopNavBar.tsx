import { useVaultStore } from "../../stores/vaultStore";
import { IconButton } from "../common/IconButton";

interface TopNavBarProps {
  onLock: () => void;
  onSettings: () => void;
}

export function TopNavBar({ onLock, onSettings }: TopNavBarProps) {
  const vault = useVaultStore((state) => state.vault);
  const isUnlocked = useVaultStore((state) => state.isUnlocked);

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
            onClick={onLock}
          />
        )}
        <IconButton
          icon="settings"
          tooltip="Settings"
          onClick={onSettings}
        />
      </div>
    </header>
  );
}
