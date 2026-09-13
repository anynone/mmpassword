import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { RepoConnect } from "./RepoConnect"
import { GitVaultSelect } from "./GitVaultSelect"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"
import type { GitRepoMeta } from "../../types/git"

type SetupStep = "connect" | "vault"

interface GitRepoSetupProps {
  onComplete: (repoUrl: string, branch: string, vaultPath: string, keyPath: string, password: string, isNew: boolean, name?: string) => void
  onBack: () => void
  initialRepo?: GitRepoMeta | null
}

/**
 * Two-step Git vault setup: one form for repo URL + branch + SSH key, then
 * vault selection. Connection problems surface on the vault step (which
 * clones the repo) and the back arrow returns to the form.
 */
export function GitRepoSetup({ onComplete, onBack, initialRepo }: GitRepoSetupProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<SetupStep>(initialRepo ? "vault" : "connect")
  const [sshKeyPath, setSshKeyPath] = useState<string>(initialRepo?.keyPath || "")
  const [repoConfig, setRepoConfig] = useState<{ url: string; branch: string } | null>(
    initialRepo ? { url: initialRepo.repoUrl, branch: initialRepo.branch } : null
  )

  useEffect(() => {
    if (initialRepo) {
      setSshKeyPath(initialRepo.keyPath)
      setRepoConfig({ url: initialRepo.repoUrl, branch: initialRepo.branch })
      setStep("vault")
    }
  }, [initialRepo])

  const handleConnect = (url: string, branch: string, keyPath: string) => {
    setSshKeyPath(keyPath)
    setRepoConfig({ url, branch })
    setStep("vault")
  }

  const handleOpenVault = (vaultPath: string, password: string) => {
    if (repoConfig) onComplete(repoConfig.url, repoConfig.branch, vaultPath, sshKeyPath, password, false)
  }

  const handleCreateVault = (vaultPath: string, name: string, password: string) => {
    if (repoConfig) onComplete(repoConfig.url, repoConfig.branch, vaultPath, sshKeyPath, password, true, name)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg"
          onClick={step === "vault" ? () => setStep("connect") : onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-headline font-bold">{t("gitSetup.title")}</h2>
        <div className="flex items-center gap-1">
          {(["connect", "vault"] as const).map((s) => (
            <span key={s} className={cn("w-2 h-2 rounded-full", step === s ? "bg-primary" : "bg-border")} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {step === "connect" && (
          <RepoConnect onConnect={handleConnect} />
        )}
        {step === "vault" && repoConfig && (
          <GitVaultSelect
            repoUrl={repoConfig.url}
            branch={repoConfig.branch}
            keyPath={sshKeyPath}
            onOpenVault={handleOpenVault}
            onCreateVault={handleCreateVault}
          />
        )}
      </div>
    </div>
  )
}
