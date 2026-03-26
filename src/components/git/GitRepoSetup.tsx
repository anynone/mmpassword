import { useState, useEffect } from "react";
import { SshKeyConfig } from "./SshKeyConfig";
import { RepoConfig } from "./RepoConfig";
import { GitVaultSelect } from "./GitVaultSelect";
import type { GitRepoMeta } from "../../types/git";

type SetupStep = "ssh" | "repo" | "vault";

interface GitRepoSetupProps {
  onComplete: (repoUrl: string, branch: string, vaultPath: string, keyPath: string, password: string, isNew: boolean, name?: string) => void;
  onBack: () => void;
  initialRepo?: GitRepoMeta | null;
}

export function GitRepoSetup({ onComplete, onBack, initialRepo }: GitRepoSetupProps) {
  const [step, setStep] = useState<SetupStep>(initialRepo ? "vault" : "ssh");
  const [sshKeyPath, setSshKeyPath] = useState<string>(initialRepo?.keyPath || "");
  const [repoConfig, setRepoConfig] = useState<{
    url: string;
    branch: string;
  } | null>(initialRepo ? { url: initialRepo.repoUrl, branch: initialRepo.branch } : null);

  // If initialRepo is provided, skip to vault selection step
  useEffect(() => {
    if (initialRepo) {
      setSshKeyPath(initialRepo.keyPath);
      setRepoConfig({ url: initialRepo.repoUrl, branch: initialRepo.branch });
      setStep("vault");
    }
  }, [initialRepo]);

  const handleKeySelected = (keyPath: string) => {
    setSshKeyPath(keyPath);
  };

  const handleRepoConfigured = (url: string, branch: string) => {
    setRepoConfig({ url, branch });
    setStep("vault");
  };

  const handleOpenVault = (vaultPath: string, password: string) => {
    if (repoConfig) {
      onComplete(
        repoConfig.url,
        repoConfig.branch,
        vaultPath,
        sshKeyPath,
        password,
        false
      );
    }
  };

  const handleCreateVault = (vaultPath: string, name: string, password: string) => {
    if (repoConfig) {
      onComplete(
        repoConfig.url,
        repoConfig.branch,
        vaultPath,
        sshKeyPath,
        password,
        true,
        name
      );
    }
  };

  const handleBackToSsh = () => {
    setStep("ssh");
  };

  const handleBackToRepo = () => {
    setStep("repo");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-container-high">
        <button
          onClick={
            step === "vault"
              ? handleBackToRepo
              : step === "repo"
              ? handleBackToSsh
              : onBack
          }
          className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-headline font-bold">
          {step === "ssh"
            ? "SSH Key Setup"
            : step === "repo"
            ? "Repository Setup"
            : "Vault Setup"}
        </h2>
        <div className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              step === "ssh" ? "bg-primary" : "bg-outline-variant"
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full ${
              step === "repo" ? "bg-primary" : "bg-outline-variant"
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full ${
              step === "vault" ? "bg-primary" : "bg-outline-variant"
            }`}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === "ssh" && (
          <div className="space-y-4">
            <SshKeyConfig
              onKeySelected={handleKeySelected}
              selectedKey={sshKeyPath}
            />
            {sshKeyPath && (
              <button
                onClick={() => setStep("repo")}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
                Continue to Repository Setup
              </button>
            )}
          </div>
        )}

        {step === "repo" && (
          <RepoConfig
            sshKeyPath={sshKeyPath}
            onConfigured={handleRepoConfigured}
          />
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
  );
}
