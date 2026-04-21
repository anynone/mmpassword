import { useTranslation } from "../../i18n"
import { ShieldCheck, LockOpen, Lock, RefreshCw, FolderOpen, Github } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { useSettingsStore } from "../../stores/settingsStore"

interface AppFooterProps {
  status?: "secure" | "unlocked" | "locked"
  version?: string
  isSyncing?: boolean
}

function getVaultSourceInfo(): { label: string; icon: "local" | "git" } | null {
  const vault = useVaultStore.getState().vault
  if (!vault) return null

  const { lastVaultPath, lastGitVault } = useSettingsStore.getState()

  if (lastGitVault) {
    return {
      label: `${lastGitVault.repoName}:${vault.name}.mmp`,
      icon: "git",
    }
  }

  if (lastVaultPath) {
    return { label: lastVaultPath, icon: "local" }
  }

  return { label: `${vault.name}.mmp`, icon: "local" }
}

export function AppFooter({
  status = "secure",
  version = "0.1.0",
  isSyncing = false,
}: AppFooterProps) {
  const { t } = useTranslation()
  const isUnlocked = useVaultStore((s) => s.isUnlocked)
  const vault = useVaultStore((s) => s.vault)

  const statusConfig = {
    secure: {
      text: t("statusBar.secure"),
      color: "text-emerald-600 dark:text-emerald-400",
      Icon: ShieldCheck,
    },
    unlocked: {
      text: t("statusBar.unlocked"),
      color: "text-amber-600 dark:text-amber-400",
      Icon: LockOpen,
    },
    locked: {
      text: t("statusBar.locked"),
      color: "text-muted-foreground",
      Icon: Lock,
    },
  }

  const { text, color, Icon } = statusConfig[status]

  const vaultSource = vault && isUnlocked ? getVaultSourceInfo() : null
  const VaultIcon = vaultSource?.icon === "git" ? Github : FolderOpen

  return (
    <footer className="flex justify-between items-center px-4 h-8 bg-muted/50 border-t border-border/30 text-xs shrink-0">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className={`font-bold ${color}`}>{text}</span>
      </div>
      {vaultSource && (
        <div
          className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[50%]"
          title={vaultSource.label}
        >
          <VaultIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{vaultSource.label}</span>
        </div>
      )}
      <div className="flex items-center gap-3 text-muted-foreground">
        {isSyncing && (
          <div
            className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400"
            title={t("sync.syncing")}
          >
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="font-medium">{t("sync.syncing")}</span>
          </div>
        )}
        <span>v{version}</span>
      </div>
    </footer>
  )
}
