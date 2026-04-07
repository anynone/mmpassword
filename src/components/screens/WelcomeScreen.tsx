import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useVaultStore } from "../../stores/vaultStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { VaultMeta, GitRepoMeta } from "../../types";
import { GitRepoSetup } from "../git/GitRepoSetup";
import { SettingsModal } from "../settings";
import { Modal } from "../common";
import { useTranslation } from "../../i18n";

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedGitRepo, setSelectedGitRepo] = useState<GitRepoMeta | null>(null);
  const [showAllVaults, setShowAllVaults] = useState(false);
  const [showAllGitRepos, setShowAllGitRepos] = useState(false);

  const { getRecentVaults } = useVaultStore();
  const { openLastVault, setOpenLastVault } = useSettingsStore();
  const { t } = useTranslation();

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

    if (days === 0) return t("welcome.today");
    if (days === 1) return t("welcome.yesterday");
    if (days < 7) return t("welcome.daysAgo", { days });
    return d.toLocaleDateString();
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-2 bg-surface/80 backdrop-blur-xl border-b border-surface-container-high/30">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">lock</span>
          <span className="text-lg font-headline font-extrabold tracking-tight text-on-surface">
            mmpassword
          </span>
          <div className="h-4 w-px bg-outline-variant mx-2"></div>
          <span className="text-on-surface-variant text-xs font-medium">
            {t("app.tagline")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 pt-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6">
            <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight mb-1">
              {t("welcome.title")}
            </h1>
            <p className="text-on-surface-variant text-base">
              {t("welcome.subtitle")}
            </p>
          </header>

          {/* Recent Vaults */}
          <section className="mb-6">
            <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary">folder_open</span>
              {t("welcome.recentVaults")}
            </h3>
            {isLoading ? (
              <div className="text-on-surface-variant">Loading...</div>
            ) : recentVaults.length > 0 ? (
              <div className="space-y-2">
                {recentVaults.slice(0, 3).map((vault) => (
                  <button
                    key={vault.path}
                    onClick={() => onOpenVault(vault.path)}
                    className="w-full group bg-surface-container-lowest p-3 rounded-xl shadow-ambient hover:bg-white dark:hover:bg-surface-container-high transition-all cursor-pointer border border-transparent hover:border-primary/20 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-on-surface">{vault.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {formatLastAccessed(vault.lastAccessed)} •{" "}
                          {vault.isGithub ? t("welcome.git") : t("welcome.localStorage")}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </button>
                ))}
                {recentVaults.length > 3 && (
                  <button
                    onClick={() => setShowAllVaults(true)}
                    className="w-full text-center py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {t("welcome.viewMore")}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-on-surface-variant">{t("welcome.noRecentVaults")}</p>
            )}
          </section>

          {/* Recent Git Repositories */}
          {recentGitRepos.length > 0 && (
            <section className="mb-6">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary">cloud_sync</span>
                {t("welcome.recentGitRepos")}
              </h3>
              <div className="space-y-2">
                {recentGitRepos.slice(0, 3).map((repo) => (
                  <button
                    key={`${repo.repoUrl}-${repo.branch}`}
                    onClick={() => {
                      setSelectedGitRepo(repo);
                      setShowGitSetup(true);
                    }}
                    className="w-full group bg-surface-container-lowest p-3 rounded-xl shadow-ambient hover:bg-white dark:hover:bg-surface-container-high transition-all cursor-pointer border border-transparent hover:border-primary/20 text-left"
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
                {recentGitRepos.length > 3 && (
                  <button
                    onClick={() => setShowAllGitRepos(true)}
                    className="w-full text-center py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {t("welcome.viewMore")}
                  </button>
                )}
              </div>
            </section>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={onCreateVault}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all group border border-primary/10"
            >
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">add</span>
              </div>
              <span className="font-headline font-bold text-sm text-primary">{t("welcome.newVault")}</span>
            </button>

            <button
              onClick={handleOpenFile}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-secondary-container/20 hover:bg-secondary-container/40 transition-all group border border-secondary-container/20"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-on-secondary shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">folder_open</span>
              </div>
              <span className="font-headline font-bold text-sm text-secondary">{t("welcome.openLocalFile")}</span>
            </button>

            <button
              onClick={() => setShowGitSetup(true)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-surface-container-highest hover:bg-surface-container-high transition-all group border border-outline-variant/30"
            >
              <div className="w-12 h-12 rounded-full bg-on-surface flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">cloud_sync</span>
              </div>
              <span className="font-headline font-bold text-sm text-on-surface">{t("welcome.connectGitRepo")}</span>
            </button>
          </div>

          {/* Options */}
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg">
            <input
              type="checkbox"
              id="open-last"
              checked={openLastVault}
              onChange={(e) => setOpenLastVault(e.target.checked)}
              className="w-5 h-5 rounded border-outline text-primary focus:ring-primary-container bg-surface-container-lowest"
            />
            <label
              htmlFor="open-last"
              className="text-sm font-medium text-on-surface-variant cursor-pointer select-none"
            >
              {t("welcome.openLastVault")}
            </label>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-between items-center px-4 h-8 bg-surface-container-low border-t border-surface-container-high/30 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t("status.secure")}</span>
        </div>
        <div className="text-on-surface-variant">v0.1.0</div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

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

      {/* All Recent Vaults Modal */}
      <Modal
        isOpen={showAllVaults}
        onClose={() => setShowAllVaults(false)}
        title={t("welcome.allRecentVaults")}
        size="lg"
      >
        <div className="space-y-2">
          {recentVaults.map((vault) => (
            <button
              key={vault.path}
              onClick={() => {
                setShowAllVaults(false);
                onOpenVault(vault.path);
              }}
              className="w-full group bg-surface-container-lowest p-3 rounded-xl shadow-ambient hover:bg-white dark:hover:bg-surface-container-high transition-all cursor-pointer border border-transparent hover:border-primary/20 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-on-surface">{vault.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {formatLastAccessed(vault.lastAccessed)} •{" "}
                    {vault.isGithub ? t("welcome.git") : t("welcome.localStorage")}
                  </p>
                </div>
                <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                  chevron_right
                </span>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* All Recent Git Repos Modal */}
      <Modal
        isOpen={showAllGitRepos}
        onClose={() => setShowAllGitRepos(false)}
        title={t("welcome.allRecentGitRepos")}
        size="lg"
      >
        <div className="space-y-2">
          {recentGitRepos.map((repo) => (
            <button
              key={`${repo.repoUrl}-${repo.branch}`}
              onClick={() => {
                setShowAllGitRepos(false);
                setSelectedGitRepo(repo);
                setShowGitSetup(true);
              }}
              className="w-full group bg-surface-container-lowest p-3 rounded-xl shadow-ambient hover:bg-white dark:hover:bg-surface-container-high transition-all cursor-pointer border border-transparent hover:border-primary/20 text-left"
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
      </Modal>
    </div>
  );
}
