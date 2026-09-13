import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { KeyRound, ArrowRight, Loader2 } from "lucide-react"
import { useToast } from "../common/Toast"
import { useTranslation } from "@/i18n"
import { Button } from "@/components/ui/button"
import type { DetectedSshKey } from "../../types/git"

const MANUAL_KEY_OPTION = "__manual__"

interface RepoConnectProps {
  initialUrl?: string
  initialBranch?: string
  initialKeyPath?: string
  onConnect: (repoUrl: string, branch: string, keyPath: string) => void
}

/**
 * Single-form replacement for the former SSH key + repository two-step wizard:
 * repo URL, branch and SSH key are all entered here, and connectivity is
 * verified implicitly by the vault scan (clone) on the next step.
 */
export function RepoConnect({
  initialUrl = "",
  initialBranch = "main",
  initialKeyPath = "",
  onConnect,
}: RepoConnectProps) {
  const { showToast } = useToast()
  const { t } = useTranslation()
  const [repoUrl, setRepoUrl] = useState(initialUrl)
  const [branch, setBranch] = useState(initialBranch)
  const [detectedKeys, setDetectedKeys] = useState<DetectedSshKey[]>([])
  const [keyPath, setKeyPath] = useState(initialKeyPath)
  const [useManualKey, setUseManualKey] = useState(false)
  const [manualKeyPath, setManualKeyPath] = useState("")
  const [isLoadingKeys, setIsLoadingKeys] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const keys = await invoke<DetectedSshKey[]>("detect_ssh_keys")
        setDetectedKeys(keys)
        if (!initialKeyPath && keys.length > 0) setKeyPath(keys[0].path)
        if (keys.length === 0) setUseManualKey(true)
      } catch {
        setUseManualKey(true)
      } finally {
        setIsLoadingKeys(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleKeySelect = (value: string) => {
    if (value === MANUAL_KEY_OPTION) {
      setUseManualKey(true)
      return
    }
    setUseManualKey(false)
    setKeyPath(value)
  }

  const handleConnect = () => {
    const url = repoUrl.trim()
    if (!url) {
      showToast("error", t("gitSetup.error.urlRequired"))
      return
    }
    const isSsh = url.startsWith("git@") || url.startsWith("ssh://")
    const isHttps = url.startsWith("https://") || url.startsWith("http://")
    if (!isSsh && !isHttps) {
      showToast("error", t("gitSetup.error.urlFormat"))
      return
    }
    const effectiveKey = useManualKey ? manualKeyPath.trim() : keyPath
    if (isSsh && !effectiveKey) {
      showToast("error", t("gitSetup.error.keyRequired"))
      return
    }
    onConnect(url, branch.trim() || "main", effectiveKey)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("gitSetup.repoUrl")}</label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          placeholder="git@host:user/repo.git / https://host/user/repo.git"
          className="w-full px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none font-mono"
        />
        <p className="text-xs text-muted-foreground">{t("gitSetup.repoUrlHint")}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("gitSetup.branch")}</label>
        <input
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          placeholder="main"
          className="w-full px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          {t("gitSetup.sshKey")}
        </label>
        {isLoadingKeys ? (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <select
            value={useManualKey ? MANUAL_KEY_OPTION : keyPath}
            onChange={(e) => handleKeySelect(e.target.value)}
            className="w-full px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
          >
            {detectedKeys.map((key) => (
              <option key={key.path} value={key.path}>
                {key.path} ({key.keyType})
              </option>
            ))}
            <option value={MANUAL_KEY_OPTION}>{t("gitSetup.sshKeyManual")}</option>
          </select>
        )}

        {useManualKey && !isLoadingKeys && (
          <input
            type="text"
            value={manualKeyPath}
            onChange={(e) => setManualKeyPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            placeholder="~/.ssh/id_ed25519"
            className="w-full px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none font-mono"
          />
        )}

        {detectedKeys.length === 0 && !isLoadingKeys && (
          <p className="text-xs text-orange-700 dark:text-orange-400">{t("gitSetup.sshKeyNone")}</p>
        )}
      </div>

      <Button onClick={handleConnect} className="w-full">
        <ArrowRight className="h-4 w-4 mr-2" />
        {t("gitSetup.connect")}
      </Button>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">{t("gitSetup.tip")}</p>
      </div>
    </div>
  )
}
