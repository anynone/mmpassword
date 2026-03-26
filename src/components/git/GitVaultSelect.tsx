import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../common/Toast";

interface GitVaultSelectProps {
  repoUrl: string;
  branch: string;
  vaultPath: string;
  keyPath: string;
  onOpenVault: (password: string) => void;
  onCreateVault: (name: string, password: string) => void;
  onBack: () => void;
}

export function GitVaultSelect({
  repoUrl,
  branch,
  vaultPath,
  keyPath,
  onOpenVault,
  onCreateVault,
  onBack,
}: GitVaultSelectProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [vaultExists, setVaultExists] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"check" | "open" | "create">("check");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [vaultName, setVaultName] = useState("My Vault");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if vault exists in the repository
  useEffect(() => {
    checkVaultExists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoUrl, branch, vaultPath, keyPath]);

  const checkVaultExists = async () => {
    setIsLoading(true);
    try {
      const exists = await invoke<boolean>("git_vault_exists", {
        repoUrl,
        branch,
        vaultPath,
        keyPath,
      });
      setVaultExists(exists);
      if (exists) {
        setMode("open");
      } else {
        setMode("create");
      }
    } catch (error) {
      showToast("error", `Failed to check vault: ${error}`);
      setMode("create");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenVault = async () => {
    if (!password) {
      showToast("error", "Please enter your password");
      return;
    }
    setIsSubmitting(true);
    try {
      onOpenVault(password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVault = async () => {
    if (!vaultName.trim()) {
      showToast("error", "Please enter a vault name");
      return;
    }
    if (!password) {
      showToast("error", "Please enter a password");
      return;
    }
    if (password !== confirmPassword) {
      showToast("error", "Passwords do not match");
      return;
    }
    if (password.length < 8) {
      showToast("error", "Password must be at least 8 characters");
      return;
    }
    setIsSubmitting(true);
    try {
      onCreateVault(vaultName, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract repo name from URL for display
  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || repoUrl;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-container-high">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-headline font-bold">
          {isLoading
            ? "Checking Repository..."
            : mode === "open"
            ? "Open Vault"
            : "Create Vault"}
        </h2>
        <div className="w-8" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">
              sync
            </span>
            <p className="mt-4 text-on-surface-variant">Checking repository...</p>
          </div>
        ) : (
          <>
            {/* Repository info */}
            <div className="p-4 bg-surface-container rounded-xl mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  folder
                </span>
                <div>
                  <p className="font-medium text-on-surface">{repoName}</p>
                  <p className="text-xs text-on-surface-variant">
                    Branch: {branch} • Path: {vaultPath}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode selection if vault exists */}
            {vaultExists && mode === "open" && (
              <div className="space-y-4">
                <div className="p-4 bg-primary-container rounded-xl">
                  <p className="text-on-primary-container">
                    A vault file was found in this repository. Enter your password to unlock it.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">
                    Master Password:
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your master password"
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleOpenVault}
                  disabled={isSubmitting || !password}
                  className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin">
                      sync
                    </span>
                  ) : (
                    <span className="material-symbols-outlined">lock_open</span>
                  )}
                  {isSubmitting ? "Unlocking..." : "Unlock Vault"}
                </button>

                {/* Option to create new vault instead */}
                <div className="text-center">
                  <button
                    onClick={() => setMode("create")}
                    className="text-sm text-primary hover:underline"
                  >
                    Or create a new vault with a different path
                  </button>
                </div>
              </div>
            )}

            {/* Create mode */}
            {mode === "create" && (
              <div className="space-y-4">
                {!vaultExists && (
                  <div className="p-4 bg-tertiary-container rounded-xl">
                    <p className="text-on-tertiary-container">
                      No vault found in this repository. Create a new vault to get started.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">
                    Vault Name:
                  </label>
                  <input
                    type="text"
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    placeholder="My Vault"
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">
                    Master Password:
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">
                    Confirm Password:
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleCreateVault}
                  disabled={isSubmitting || !password || !vaultName.trim()}
                  className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin">
                      sync
                    </span>
                  ) : (
                    <span className="material-symbols-outlined">add</span>
                  )}
                  {isSubmitting ? "Creating..." : "Create Vault"}
                </button>

                {/* Option to open existing vault if exists */}
                {vaultExists && (
                  <div className="text-center">
                    <button
                      onClick={() => setMode("open")}
                      className="text-sm text-primary hover:underline"
                    >
                      Open existing vault instead
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
