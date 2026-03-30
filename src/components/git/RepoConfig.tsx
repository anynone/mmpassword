import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../common/Toast";
import type { GitAccessValidation } from "../../types/git";

interface RepoConfigProps {
  sshKeyPath: string;
  onConfigured: (repoUrl: string, branch: string) => void;
}

export function RepoConfig({ sshKeyPath, onConfigured }: RepoConfigProps) {
  const { showToast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<GitAccessValidation | null>(null);

  const validateAccess = async () => {
    if (!repoUrl.trim()) {
      showToast("error", "Please enter a repository URL");
      return;
    }

    const isSsh = repoUrl.startsWith("git@") || repoUrl.startsWith("ssh://");
    const isHttps = repoUrl.startsWith("https://") || repoUrl.startsWith("http://");
    if (!isSsh && !isHttps) {
      showToast("error", "URL must be in SSH (git@host:user/repo.git) or HTTPS (https://host/user/repo.git) format");
      return;
    }

    setIsValidating(true);
    setValidation(null);
    try {
      const result = await invoke<GitAccessValidation>("validate_git_access", {
        repoUrl,
        keyPath: sshKeyPath,
      });
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
    onConfigured(repoUrl, branch);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">Repository URL:</label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value);
            setValidation(null);
          }}
          placeholder="git@host:user/repo.git or ssh://git@host:port/user/repo.git"
          className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none font-mono"
        />
        <p className="text-xs text-on-surface-variant">SSH or HTTPS URL from your Git provider (GitHub, GitLab, Gitea, etc.)</p>
      </div>

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

      {validation && (
        <div className={`p-3 rounded-lg ${validation.valid ? "bg-primary-container" : "bg-error-container"}`}>
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined ${validation.valid ? "text-primary" : "text-error"}`}>
              {validation.valid ? "check_circle" : "error"}
            </span>
            <div>
              <p className={`text-sm font-medium ${validation.valid ? "text-on-primary-container" : "text-on-error-container"}`}>
                {validation.valid ? "Access verified!" : "Access validation failed"}
              </p>
              {validation.repoName && (
                <p className="text-xs text-on-surface-variant">{validation.repoName}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {validation?.valid && (
        <button
          onClick={handleContinue}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">arrow_forward</span>
          Continue
        </button>
      )}

      <div className="p-3 bg-surface-container rounded-lg">
        <p className="text-xs text-on-surface-variant">
          <span className="font-medium">Tip:</span> Make sure your SSH key is added to your Git provider.
        </p>
      </div>
    </div>
  );
}
