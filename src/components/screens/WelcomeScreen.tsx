import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useVaultStore } from "../../stores/vaultStore";
import type { VaultMeta, GitRepoMeta } from "../../types";
import { GitRepoSetup } from "../git/GitRepoSetup";

interface WelcomeScreenProps {
  onOpenVault: (path: string) => void;
  onCreateVault: () => void;
  onOpenGitVault?: (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    password: string
  ) => void;
  onCreateGitVault?: (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    name: string,
    password: string
  ) => void;
}

export function WelcomeScreen({
  onOpenVault,
  onCreateVault,
  onOpenGitVault,
  onCreateGitVault,
}: WelcomeScreenProps) {
  const [recentVaults, setRecentVaults] = useState<VaultMeta[]>([]);
  const [recentGitRepos, setRecentGitRepos] = useState<GitRepoMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGitSetup, setShowGitSetup] = useState(false);
  const [selectedGitRepo, setSelectedGitRepo] = useState<GitRepoMeta | null>(null);

  const { getRecentVaults } = useVaultStore();

  useEffect(() => {
    loadRecentData();
  }, []);

  const loadRecentData = async () => {
    setIsLoading(true);
    try {
      const vaults = await getRecentVaults();
      setRecentVaults(vaults);

      // Load recent git repos
      const gitRepos = await invoke<GitRepoMeta[]>("get_recent_git_repos");
      setRecentGitRepos(gitRepos);
    } catch (error) {
      console.error("Failed to load recent data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "mmpassword Vault", extensions: ["mmp"] }],
    });

    if (selected && typeof selected === "string") {
      onOpenVault(selected);
    }
  };

  const handleGitSetupComplete = (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    password: string,
    isNew: boolean,
    name?: string
  ) => {
    setShowGitSetup(false);

    if (isNew && name) {
      // Create new vault
      if (onCreateGitVault) {
        onCreateGitVault(repoUrl, branch, vaultPath, keyPath, name, password);
      }
    } else {
      // Open existing vault
      if (onOpenGitVault) {
        onOpenGitVault(repoUrl, branch, vaultPath, keyPath, password);
      }
    }
  };

  const formatLastAccessed = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-2 bg-surface/80 backdrop-blur-xl border-b border-surface-container-high/30">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">lock</span>
          <span className="text-lg font-headline font-extrabold tracking-tight text-on-surface">
            mmpassword
          </span>
          <div className="h-4 w-px bg-outline-variant mx-2"></div>
          <span className="text-on-surface-variant text-xs font-medium">
            Secure Local Password Manager
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
              Welcome Back
            </h1>
            <p className="text-on-surface-variant text-lg">
              Your encrypted local sanctuary is ready.
            </p>
          </header>

          {/* Recent Vaults */}
          <section className="mb-12">
            <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">folder_open</span>
              Recent Vaults
            </h3>
            {isLoading ? (
              <div className="text-on-surface-variant">Loading...</div>
            ) : recentVaults.length > 0 ? (
              <div className="space-y-3">
                {recentVaults.map((vault) => (
                  <button
                    key={vault.path}
                    onClick={() => onOpenVault(vault.path)}
                    className="w-full group bg-surface-container-lowest p-4 rounded-xl shadow-ambient hover:bg-white transition-all cursor-pointer border border-transparent hover:border-primary/20 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-on-surface">{vault.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {formatLastAccessed(vault.lastAccessed)} •{" "}
                          {vault.isGithub ? "Git" : "Local Storage"}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-on-surface-variant">No recent vaults. Create or open one to get started.</p>
            )}
          </section>

          {/* Recent Git Repositories */}
          {recentGitRepos.length > 0 && (
            <section className="mb-12">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">cloud_sync</span>
                Recent Git Repositories
              </h3>
              <div className="space-y-3">
                {recentGitRepos.map((repo) => (
                  <button
                    key={`${repo.repoUrl}-${repo.branch}`}
                    onClick={() => {
                      // Set the selected repo and show git setup
                      setSelectedGitRepo(repo);
                      setShowGitSetup(true);
                    }}
                    className="w-full group bg-surface-container-lowest p-4 rounded-xl shadow-ambient hover:bg-white transition-all cursor-pointer border border-transparent hover:border-primary/20 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-on-surface">{repo.repoName}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {repo.branch} • {formatLastAccessed(repo.lastAccessed)}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Action Cards */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <button
              onClick={onCreateVault}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all group border border-primary/10"
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">add</span>
              </div>
              <span className="font-headline font-bold text-primary">New Vault</span>
            </button>

            <button
              onClick={handleOpenFile}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-secondary-container/20 hover:bg-secondary-container/40 transition-all group border border-secondary-container/20"
            >
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">folder_open</span>
              </div>
              <span className="font-headline font-bold text-secondary">Open Local File</span>
            </button>

            <button
              onClick={() => setShowGitSetup(true)}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-surface-container-highest hover:bg-surface-container-high transition-all group border border-outline-variant/30"
            >
              <div className="w-14 h-14 rounded-full bg-on-surface flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">cloud_sync</span>
              </div>
              <span className="font-headline font-bold text-on-surface">Connect Git Repo</span>
            </button>
          </div>

          {/* Options */}
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg">
            <input
              type="checkbox"
              id="open-last"
              className="w-5 h-5 rounded border-outline text-primary focus:ring-primary-container bg-surface-container-lowest"
            />
            <label
              htmlFor="open-last"
              className="text-sm font-medium text-on-surface-variant cursor-pointer select-none"
            >
              Open last used vault on startup
            </label>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-between items-center px-4 h-8 bg-surface-container-low border-t border-surface-container-high/30 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-emerald-600 font-bold">Status: Secure</span>
        </div>
        <div className="text-on-surface-variant">v0.1.0</div>
      </footer>

      {/* Git Setup Modal */}
      {showGitSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <GitRepoSetup
              onComplete={handleGitSetupComplete}
              onBack={() => {
                setShowGitSetup(false);
                setSelectedGitRepo(null);
              }}
              initialRepo={selectedGitRepo}
            />
          </div>
        </div>
      )}
    </div>
  );
}
