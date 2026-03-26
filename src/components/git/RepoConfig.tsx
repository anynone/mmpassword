import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../common/Toast";
import type { GitAccessValidation } from "../../types/git";

interface RepoConfigProps {
  sshKeyPath: string;
  onConfigured: (repoUrl: string, branch: string, vaultPath: string) => void;
  onBack: () => void;
}

export function RepoConfig({ sshKeyPath, onConfigured, onBack }: RepoConfigProps) {
  const { showToast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [vaultPath, setVaultPath] = useState("vault.mmp");
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<GitAccessValidation | null>(null);

  // Debug: log validation state changes
  useEffect(() => {
    console.log("validation state changed:", validation);
    if (validation) {
      console.log("validation.valid:", validation.valid, "type:", typeof validation.valid);
      console.log("Should show Continue button:", validation.valid === true);
    }
  }, [validation]);

  const validateAccess = async () => {
    if (!repoUrl.trim()) {
      showToast("error", "Please enter a repository URL");
      return;
    }

    // Validate SSH URL format
    if (!repoUrl.startsWith("git@")) {
      showToast("error", "URL must be in SSH format: git@github.com:user/repo.git");
      return;
    }

    setIsValidating(true);
    setValidation(null);
    try {
      const result = await invoke<GitAccessValidation>("validate_git_access", {
        repoUrl,
        keyPath: sshKeyPath,
      });
      console.log("validate_git_access result:", JSON.stringify(result, null, 2));
      console.log("result.valid type:", typeof result.valid, "value:", result.valid);
      console.log("result.valid === true:", result.valid === true);
      console.log("result keys:", Object.keys(result || {}));

      setValidation(result);

      if (result.valid) {
        showToast("success", "Repository access verified!");
        if (result.defaultBranch) {
          setBranch(result.defaultBranch);
        }
      }
    } catch (error) {
      showToast("error", `Failed to validate access: ${error}`);
      setValidation({
        valid: false,
        repoName: null,
        defaultBranch: null,
        error: String(error),
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    if (!validation?.valid) {
      showToast("error", "Please validate repository access first");
      return;
    }
    onConfigured(repoUrl, branch, vaultPath);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h3 className="text-lg font-headline font-bold text-on-surface">
          Configure Git Repository
        </h3>
      </div>

      {/* Repository URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">
          Repository URL (SSH):
        </label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value);
            setValidation(null);
          }}
          placeholder="git@github.com:username/repository.git"
          className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none font-mono"
        />
        <p className="text-xs text-on-surface-variant">
          Use SSH URL format from your Git provider
        </p>
      </div>

      {/* Branch */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">Branch:</label>
        <input
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="main"
          className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
        />
      </div>

      {/* Vault path */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">
          Vault file path:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={vaultPath.replace(/\.mmp$/, "")}
            onChange={(e) => setVaultPath(e.target.value + ".mmp")}
            className="flex-1 px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
          />
          <span className="text-sm text-on-surface-variant">.mmp</span>
        </div>
      </div>

      {/* Validate button */}
      <button
        onClick={validateAccess}
        disabled={isValidating || !repoUrl.trim()}
        className="w-full py-3 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isValidating ? (
          <>
            <span className="material-symbols-outlined animate-spin">sync</span>
            Validating...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">verified_user</span>
            Validate Access
          </>
        )}
      </button>

      {/* Validation result */}
      {validation && (
        <div
          className={`p-4 rounded-lg ${
            validation.valid ? "bg-primary-container" : "bg-error-container"
          }`}
        >
          {/* Debug info */}
          <pre className="text-xs mb-2 opacity-50">{JSON.stringify(validation)}</pre>
          <div className="flex items-start gap-3">
            <span
              className={`material-symbols-outlined ${
                validation.valid ? "text-primary" : "text-error"
              }`}
            >
              {validation.valid ? "check_circle" : "error"}
            </span>
            <div>
              <p
                className={`font-medium ${
                  validation.valid
                    ? "text-on-primary-container"
                    : "text-on-error-container"
                }`}
              >
                {validation.valid
                  ? "Access verified!"
                  : "Access validation failed"}
              </p>
              {validation.repoName && (
                <p className="text-sm text-on-surface-variant mt-1">
                  Repository: {validation.repoName}
                </p>
              )}
              {validation.defaultBranch && (
                <p className="text-sm text-on-surface-variant">
                  Default branch: {validation.defaultBranch}
                </p>
              )}
              {validation.error && (
                <p className="text-sm text-on-error-container mt-1">
                  {validation.error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Continue button - show when validation is successful */}
      {validation && validation.valid === true && (
        <button
          onClick={handleContinue}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">arrow_forward</span>
          Continue
        </button>
      )}

      {/* Debug: Show button state */}
      {validation && (
        <p className="text-xs text-on-surface-variant">
          Debug: validation.valid = {String(validation.valid)}, type = {typeof validation.valid}, show button = {String(validation.valid === true)}
        </p>
      )}

      {/* Help text */}
      <div className="p-3 bg-surface-container rounded-lg">
        <p className="text-xs text-on-surface-variant">
          <span className="font-medium">Tip:</span> Make sure your SSH key is
          added to your Git provider (GitHub, GitLab, etc.) and you have read
          and write access to the repository.
        </p>
      </div>
    </div>
  );
}
