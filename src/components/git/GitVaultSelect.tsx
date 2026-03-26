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
      setMode(exists ? "open" : "create");
    } catch (error) {
      showToast("error", `Failed to check vault: ${error}`);
      setMode("create");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenVault = () => {
    if (!password) {
      showToast("error", "Please enter your password");
      return;
    }
    setIsSubmitting(true);
    onOpenVault(password);
  };

  const handleCreateVault = () => {
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
    onCreateVault(vaultName, password);
  };

  // Extract repo name from URL for display
  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || repoUrl;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-surface-container-high">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-headline font-bold">
          {isLoading ? "Checking..." : mode === "open" ? "Open Vault" : "Create Vault"}
        </h2>
        <div className="w-8" />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
          <p className="mt-2 text-sm text-on-surface-variant">Checking repository...</p>
        </div>
      ) : (
        <>
          {/* Repository info */}
          <div className="p-3 bg-surface-container rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">folder</span>
              <div>
                <p className="font-medium text-on-surface text-sm">{repoName}</p>
                <p className="text-xs text-on-surface-variant">{branch} • {vaultPath}</p>
              </div>
            </div>
          </div>

          {/* Open mode */}
          {vaultExists && mode === "open" && (
            <div className="space-y-3">
              <div className="p-3 bg-primary-container rounded-lg">
                <p className="text-sm text-on-primary-container">
                  A vault file was found. Enter your password to unlock it.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-on-surface">Master Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your master password"
                  className="w-full mt-1 px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                />
              </div>

              <button
                onClick={handleOpenVault}
                disabled={isSubmitting || !password}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined">lock_open</span>
                )}
                {isSubmitting ? "Unlocking..." : "Unlock Vault"}
              </button>

              <button
                onClick={() => setMode("create")}
                className="w-full text-sm text-primary hover:underline"
              >
                Create a new vault instead
              </button>
            </div>
          )}

          {/* Create mode */}
          {mode === "create" && (
            <div className="space-y-3">
              {!vaultExists && (
                <div className="p-3 bg-tertiary-container rounded-lg">
                  <p className="text-sm text-on-tertiary-container">
                    No vault found. Create a new vault to get started.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-on-surface">Vault Name:</label>
                <input
                  type="text"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder="My Vault"
                  className="w-full mt-1 px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-on-surface">Master Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full mt-1 px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-on-surface">Confirm Password:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full mt-1 px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                />
              </div>

              <button
                onClick={handleCreateVault}
                disabled={isSubmitting || !password || !vaultName.trim()}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined">add</span>
                )}
                {isSubmitting ? "Creating..." : "Create Vault"}
              </button>

              {vaultExists && (
                <button
                  onClick={() => setMode("open")}
                  className="w-full text-sm text-primary hover:underline"
                >
                  Open existing vault instead
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
