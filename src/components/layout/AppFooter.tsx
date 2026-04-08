import { useTranslation } from "../../i18n"
import { ShieldCheck, LockOpen, Lock } from "lucide-react"

interface AppFooterProps {
  status?: "secure" | "unlocked" | "locked"
  version?: string
}

export function AppFooter({
  status = "secure",
  version = "0.1.0",
}: AppFooterProps) {
  const { t } = useTranslation()

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

  return (
    <footer className="flex justify-between items-center px-4 h-8 bg-muted/50 border-t border-border/30 text-xs shrink-0">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className={`font-bold ${color}`}>{text}</span>
      </div>
      <div className="text-muted-foreground">v{version}</div>
    </footer>
  )
}
