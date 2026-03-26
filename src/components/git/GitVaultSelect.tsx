import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../common/Toast";

interface GitVaultSelectProps {
  repoUrl: string;
  branch: string;
  keyPath: string;
  onOpenVault: (vaultPath: string, password: string) => void;
  onCreateVault: (vaultPath: string, name: string, password: string) => void;
}

export function GitVaultSelect({
  repoUrl,
  branch,
  keyPath,
  onOpenVault,
  onCreateVault,
}: GitVaultSelectProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [vaultFiles, setVaultFiles] = useState<string[]>([]);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [vaultName, setVaultName] = useState("My Vault");
  const [customVaultPath, setCustomVaultPath] = useState("vault");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load vault files from repository
  useEffect(() => {
    loadVaultFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoUrl, branch, keyPath]);

  const loadVaultFiles = async () => {
    setIsLoading(true);
    try {
      const files = await invoke<string[]>("list_git_vaults", {
        repoUrl,
        branch,
        keyPath,
      });
      setVaultFiles(files);
      if (files.length > 0) {
        setMode("select");
        setSelectedVault(files[0]);
      } else {
        setMode("create");
      }
    } catch (error) {
      showToast("error", `Failed to list vaults: ${error}`);
      setMode("create");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenVault = () => {
    if (!selectedVault) {
      showToast("error", "Please select a vault");
      return;
    }
    if (!password) {
      showToast("error", "Please enter your password");
      return;
    }
    setIsSubmitting(true);
    onOpenVault(selectedVault, password);
  };

  const handleCreateVault = () => {
    if (!vaultName.trim()) {
      showToast("error", "Please enter a vault name");
      return;
    }
    if (!customVaultPath.trim()) {
      showToast("error", "Please enter a vault filename");
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
    const vaultPath = customVaultPath.endsWith(".mmp")
      ? customVaultPath
      : `${customVaultPath}.mmp`;
    onCreateVault(vaultPath, vaultName, password);
  };

  // Extract repo name from URL for display
  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || repoUrl;

  return (
    <div className="space-y-4">
      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
          <p className="mt-2 text-sm text-on-surface-variant">Scanning repository for vaults...</p>
        </div>
      ) : (
        <>
          {/* Repository info */}
          <div className="p-3 bg-surface-container rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">folder</span>
              <div>
                <p className="font-medium text-on-surface text-sm">{repoName}</p>
                <p className="text-xs text-on-surface-variant">{branch}</p>
              </div>
            </div>
          </div>

          {/* Select mode - vault list exists */}
          {vaultFiles.length > 0 && mode === "select" && (
            <div className="space-y-3">
              <div className="p-3 bg-primary-container rounded-lg">
                <p className="text-sm text-on-primary-container">
                  Found {vaultFiles.length} vault{vaultFiles.length > 1 ? "s" : ""} in the repository.
                  Select one to open or create a new vault.
                </p>
              </div>

              {/* Vault list */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-on-surface">Available Vaults:</label>
                {vaultFiles.map((vaultPath) => (
                  <button
                    key={vaultPath}
                    onClick={() => setSelectedVault(vaultPath)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedVault === vaultPath
                        ? "bg-primary-container border-2 border-primary"
                        : "bg-surface-container-lowest border border-outline-variant hover:border-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">
                        {selectedVault === vaultPath ? "radio_button_checked" : "radio_button_unchecked"}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{vaultPath}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Password input for selected vault */}
              {selectedVault && (
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
              )}

              <button
                onClick={handleOpenVault}
                disabled={isSubmitting || !selectedVault || !password}
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
              {vaultFiles.length === 0 && (
                <div className="p-3 bg-tertiary-container rounded-lg">
                  <p className="text-sm text-on-tertiary-container">
                    No vaults found in this repository. Create a new vault to get started.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-on-surface">Vault Filename:</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={customVaultPath.replace(/\.mmp$/, "")}
                    onChange={(e) => setCustomVaultPath(e.target.value)}
                    placeholder="vault"
                    className="flex-1 px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-on-surface-variant">.mmp</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  This will be the file path in the repository
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-on-surface">Vault Name:</label>
                <input
                  type="text"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder="My Vault"
                  className="w-full mt-1 px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  This is the display name for your vault
                </p>
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
                disabled={isSubmitting || !password || !vaultName.trim() || !customVaultPath.trim()}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined">add</span>
                )}
                {isSubmitting ? "Creating..." : "Create Vault"}
              </button>

              {vaultFiles.length > 0 && (
                <button
                  onClick={() => setMode("select")}
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
