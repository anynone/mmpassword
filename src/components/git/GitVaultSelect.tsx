import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Loader2, Folder, LockOpen, Plus, Circle, CircleDot } from "lucide-react"
import { useToast } from "../common/Toast"
import { useTranslation } from "@/i18n"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GitVaultSelectProps {
  repoUrl: string
  branch: string
  keyPath: string
  onOpenVault: (vaultPath: string, password: string) => void
  onCreateVault: (vaultPath: string, name: string, password: string) => void
}

export function GitVaultSelect({ repoUrl, branch, keyPath, onOpenVault, onCreateVault }: GitVaultSelectProps) {
  const { showToast } = useToast()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)
  const [vaultFiles, setVaultFiles] = useState<string[]>([])
  const [mode, setMode] = useState<"select" | "create">("select")
  const [selectedVault, setSelectedVault] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [vaultName, setVaultName] = useState("My Vault")
  const [customVaultPath, setCustomVaultPath] = useState("vault")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { loadVaultFiles() }, [repoUrl, branch, keyPath])

  const loadVaultFiles = async () => {
    setIsLoading(true)
    try {
      const files = await invoke<string[]>("list_git_vaults", { repoUrl, branch, keyPath })
      setVaultFiles(files)
      if (files.length > 0) { setMode("select"); setSelectedVault(files[0]) }
      else { setMode("create") }
    } catch (error) {
      showToast("error", t("gitVault.error.listFailed", { error }))
      setMode("create")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenVault = () => {
    if (!selectedVault) { showToast("error", t("gitVault.error.selectVault")); return }
    if (!password) { showToast("error", t("gitVault.error.enterPassword")); return }
    setIsSubmitting(true)
    onOpenVault(selectedVault, password)
  }

  const handleCreateVault = () => {
    if (!vaultName.trim()) { showToast("error", t("gitVault.error.enterVaultName")); return }
    if (!customVaultPath.trim()) { showToast("error", t("gitVault.error.enterVaultFilename")); return }
    if (!password) { showToast("error", t("gitVault.error.enterPassword")); return }
    if (password !== confirmPassword) { showToast("error", t("gitVault.error.passwordMismatch")); return }
    if (password.length < 8) { showToast("error", t("gitVault.error.passwordLength")); return }
    setIsSubmitting(true)
    const vaultPath = customVaultPath.endsWith(".mmp") ? customVaultPath : `${customVaultPath}.mmp`
    onCreateVault(vaultPath, vaultName, password)
  }

  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || repoUrl

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">{t("gitVault.scanning")}</p>
        </div>
      ) : (
        <>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-sm">{repoName}</p>
                <p className="text-xs text-muted-foreground">{branch}</p>
              </div>
            </div>
          </div>

          {vaultFiles.length > 0 && mode === "select" && (
            <div className="space-y-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm">
                  {t("gitVault.foundVaults", {
                    count: vaultFiles.length,
                    plural: vaultFiles.length > 1 ? "s" : ""
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">{t("gitVault.availableVaults")}</label>
                {vaultFiles.map((vaultPath) => (
                  <button
                    key={vaultPath}
                    onClick={() => setSelectedVault(vaultPath)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-all",
                      selectedVault === vaultPath
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-card border hover:border-primary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {selectedVault === vaultPath ? (
                        <CircleDot className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="text-sm font-medium">{vaultPath}</p>
                    </div>
                  </button>
                ))}
              </div>

              {selectedVault && (
                <div>
                  <label className="text-xs font-medium">{t("gitVault.masterPassword")}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("gitVault.enterPassword")}
                    className="w-full mt-1 px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              <Button onClick={handleOpenVault} disabled={isSubmitting || !selectedVault || !password} className="w-full">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LockOpen className="h-4 w-4 mr-2" />}
                {isSubmitting ? t("gitVault.unlocking") : t("gitVault.unlockVault")}
              </Button>

              <button onClick={() => setMode("create")} className="w-full text-sm text-primary hover:underline">
                {t("gitVault.createInstead")}
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-3">
              {vaultFiles.length === 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    {t("gitVault.noVaults")}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium">{t("gitVault.vaultFilename")}</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={customVaultPath.replace(/\.mmp$/, "")}
                    onChange={(e) => setCustomVaultPath(e.target.value)}
                    placeholder="vault"
                    className="flex-1 px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">.mmp</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("gitVault.vaultPathHint")}</p>
              </div>

              <div>
                <label className="text-xs font-medium">{t("gitVault.vaultName")}</label>
                <input
                  type="text"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder="My Vault"
                  className="w-full mt-1 px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{t("gitVault.vaultNameHint")}</p>
              </div>

              <div>
                <label className="text-xs font-medium">{t("gitVault.masterPassword")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("gitVault.createPassword")}
                  className="w-full mt-1 px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium">{t("gitVault.confirmPassword")}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("gitVault.confirmPassword")}
                  className="w-full mt-1 px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
                />
              </div>

              <Button
                onClick={handleCreateVault}
                disabled={isSubmitting || !password || !vaultName.trim() || !customVaultPath.trim()}
                className="w-full"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {isSubmitting ? t("gitVault.creating") : t("gitVault.createVault")}
              </Button>

              {vaultFiles.length > 0 && (
                <button onClick={() => setMode("select")} className="w-full text-sm text-primary hover:underline">
                  {t("gitVault.openExisting")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
