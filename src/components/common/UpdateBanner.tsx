import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Download, X } from "lucide-react"
import { useSettingsStore } from "../../stores/settingsStore"
import { useTranslation } from "../../i18n"
import { Button } from "@/components/ui/button"

interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
}

const DISMISSED_VERSION_KEY = "mmpassword.dismissedUpdateVersion"

/**
 * Soft update reminder: checks GitHub Releases once per session on startup
 * (when enabled in settings) and shows a small dismissible card in the
 * bottom-left corner. Network failures are silent; a dismissed version is
 * remembered and never shown again.
 */
export function UpdateBanner() {
  const { t } = useTranslation()
  const checkForUpdates = useSettingsStore((s) => s.checkForUpdates)
  const [update, setUpdate] = useState<UpdateCheckResult | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!checkForUpdates) return
    let cancelled = false
    invoke<UpdateCheckResult>("check_latest_version")
      .then((result) => {
        if (cancelled || !result.hasUpdate) return
        if (localStorage.getItem(DISMISSED_VERSION_KEY) === result.latestVersion) return
        setUpdate(result)
      })
      .catch(() => {
        // Offline, rate-limited or blocked: stay silent
      })
    return () => {
      cancelled = true
    }
  }, [checkForUpdates])

  if (!checkForUpdates || !update || dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_VERSION_KEY, update.latestVersion)
    setDismissed(true)
  }

  const handleView = async () => {
    try {
      await invoke("open_release_page", { url: update.releaseUrl })
    } catch {
      // Opening the browser failed; nothing else to do
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-3 rounded-lg border border-border bg-popover px-4 py-3 shadow-lg max-w-xs">
      <Download className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm">{t("update.available", { version: update.latestVersion })}</p>
      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs shrink-0" onClick={handleView}>
        {t("update.view")}
      </Button>
      <button
        type="button"
        title={t("update.dismiss")}
        onClick={handleDismiss}
        className="rounded p-1 text-muted-foreground/60 hover:bg-foreground/10 hover:text-foreground transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
