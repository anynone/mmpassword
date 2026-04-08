import { useState, useEffect } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { SshKeyConfig } from "./SshKeyConfig"
import { RepoConfig } from "./RepoConfig"
import { GitVaultSelect } from "./GitVaultSelect"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { GitRepoMeta } from "../../types/git"

type SetupStep = "ssh" | "repo" | "vault"

interface GitRepoSetupProps {
  onComplete: (repoUrl: string, branch: string, vaultPath: string, keyPath: string, password: string, isNew: boolean, name?: string) => void
  onBack: () => void
  initialRepo?: GitRepoMeta | null
}

export function GitRepoSetup({ onComplete, onBack, initialRepo }: GitRepoSetupProps) {
  const [step, setStep] = useState<SetupStep>(initialRepo ? "vault" : "ssh")
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

  const handleKeySelected = (keyPath: string) => setSshKeyPath(keyPath)

  const handleRepoConfigured = (url: string, branch: string) => {
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
          onClick={step === "vault" ? () => setStep("repo") : step === "repo" ? () => setStep("ssh") : onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-headline font-bold">
          {step === "ssh" ? "SSH Key Setup" : step === "repo" ? "Repository Setup" : "Vault Setup"}
        </h2>
        <div className="flex items-center gap-1">
          {(["ssh", "repo", "vault"] as const).map((s) => (
            <span key={s} className={cn("w-2 h-2 rounded-full", step === s ? "bg-primary" : "bg-border")} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {step === "ssh" && (
          <div className="space-y-4">
            <SshKeyConfig onKeySelected={handleKeySelected} selectedKey={sshKeyPath} />
            {sshKeyPath && (
              <Button onClick={() => setStep("repo")} className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue to Repository Setup
              </Button>
            )}
          </div>
        )}
        {step === "repo" && <RepoConfig sshKeyPath={sshKeyPath} onConfigured={handleRepoConfigured} />}
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
