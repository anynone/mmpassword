import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useVaultStore } from "../../stores/vaultStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { VaultMeta, GitRepoMeta, SubscriptionMeta } from "../../types";
import { GitRepoSetup } from "../git/GitRepoSetup";
import { SettingsModal } from "../settings";
import { useTranslation } from "../../i18n";
import { useToast } from "../common/Toast";

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
  onSubscriptionFetched?: () => void;
}

export function WelcomeScreen({
  onOpenVault,
  onCreateVault,
  onOpenGitVault,
  onCreateGitVault,
  onSubscriptionFetched,
}: WelcomeScreenProps) {
  const [recentVaults, setRecentVaults] = useState<VaultMeta[]>([]);
  const [recentGitRepos, setRecentGitRepos] = useState<GitRepoMeta[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGitSetup, setShowGitSetup] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedGitRepo, setSelectedGitRepo] = useState<GitRepoMeta | null>(null);
  const [subscriptionUrl, setSubscriptionUrl] = useState("");
  const [isFetchingSubscription, setIsFetchingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const { getRecentVaults, fetchSubscription, getSubscriptionHistory, removeSubscriptionHistory } = useVaultStore();
  const { openLastVault, setOpenLastVault } = useSettingsStore();
  const { showToast } = useToast();
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

      // Load subscription history
      const subHistory = await getSubscriptionHistory();
      setSubscriptionHistory(subHistory);
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

  const handleFetchSubscription = async () => {
    if (!subscriptionUrl.trim()) return;
    setIsFetchingSubscription(true);
    setSubscriptionError(null);
    try {
      await fetchSubscription(subscriptionUrl.trim());
      showToast("success", t("subscription.fetchSuccess"));
      // Reload history
      const history = await getSubscriptionHistory();
      setSubscriptionHistory(history);
      if (onSubscriptionFetched) onSubscriptionFetched();
    } catch (error) {
      setSubscriptionError(String(error));
      showToast("error", String(error));
    } finally {
      setIsFetchingSubscription(false);
    }
  };

  const handleQuickFetch = async (url: string) => {
    setSubscriptionUrl(url);
    setIsFetchingSubscription(true);
    setSubscriptionError(null);
    try {
      await fetchSubscription(url);
      showToast("success", t("subscription.fetchSuccess"));
      if (onSubscriptionFetched) onSubscriptionFetched();
    } catch (error) {
      setSubscriptionError(String(error));
      showToast("error", String(error));
    } finally {
      setIsFetchingSubscription(false);
    }
  };

  const handleRemoveSubscriptionHistory = async (url: string) => {
    await removeSubscriptionHistory(url);
    setSubscriptionHistory(prev => prev.filter(s => s.url !== url));
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
      <main className="flex-1 p-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
              {t("welcome.title")}
            </h1>
            <p className="text-on-surface-variant text-lg">
              {t("welcome.subtitle")}
            </p>
          </header>

          {/* Recent Vaults */}
          <section className="mb-12">
            <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">folder_open</span>
              {t("welcome.recentVaults")}
            </h3>
            {isLoading ? (
              <div className="text-on-surface-variant">Loading...</div>
            ) : recentVaults.length > 0 ? (
              <div className="space-y-3">
                {recentVaults.map((vault) => (
                  <button
                    key={vault.path}
                    onClick={() => onOpenVault(vault.path)}
                    className="w-full group bg-surface-container-lowest p-4 rounded-xl shadow-ambient hover:bg-white dark:hover:bg-surface-container-high transition-all cursor-pointer border border-transparent hover:border-primary/20 text-left"
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
            ) : (
              <p className="text-on-surface-variant">{t("welcome.noRecentVaults")}</p>
            )}
          </section>

          {/* Recent Git Repositories */}
          {recentGitRepos.length > 0 && (
            <section className="mb-12">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">cloud_sync</span>
                {t("welcome.recentGitRepos")}
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
                    className="w-full group bg-surface-container-lowest p-4 rounded-xl shadow-ambient hover:bg-white dark:hover:bg-surface-container-high transition-all cursor-pointer border border-transparent hover:border-primary/20 text-left"
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

          {/* Subscription Vault */}
          <section className="mb-12">
            <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">rss_feed</span>
              {t("subscription.title")}
            </h3>
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-ambient border border-outline-variant/10">
              <div className="flex gap-3">
                <input
                  type="url"
                  value={subscriptionUrl}
                  onChange={(e) => {
                    setSubscriptionUrl(e.target.value);
                    setSubscriptionError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFetchSubscription();
                  }}
                  placeholder={t("subscription.urlPlaceholder")}
                  className="flex-1 bg-surface-container-highest rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 outline-none transition-all border border-outline-variant/20"
                  disabled={isFetchingSubscription}
                />
                <button
                  onClick={handleFetchSubscription}
                  disabled={isFetchingSubscription || !subscriptionUrl.trim()}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isFetchingSubscription ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      {t("subscription.fetching")}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">download</span>
                      {t("subscription.fetch")}
                    </>
                  )}
                </button>
              </div>
              {subscriptionError && (
                <p className="text-error text-xs mt-2">{subscriptionError}</p>
              )}
            </div>

            {/* Subscription History */}
            {subscriptionHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
                  {t("subscription.history")}
                </h4>
                <div className="space-y-2">
                  {subscriptionHistory.map((sub) => (
                    <div
                      key={sub.url}
                      className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10 group"
                    >
                      <button
                        onClick={() => handleQuickFetch(sub.url)}
                        className="flex-1 text-left hover:bg-surface-container-high rounded-lg px-2 py-1 -ml-2 transition-colors"
                        disabled={isFetchingSubscription}
                      >
                        <p className="font-medium text-sm text-on-surface">{sub.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {t("subscription.entryCount", { count: sub.entryCount })} • {formatLastAccessed(sub.lastAccessed)}
                        </p>
                      </button>
                      <button
                        onClick={() => handleRemoveSubscriptionHistory(sub.url)}
                        className="p-1.5 rounded-full hover:bg-error-container/20 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-sm text-on-surface-variant hover:text-error">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          <div className="grid grid-cols-3 gap-6 mb-12">
            <button
              onClick={onCreateVault}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all group border border-primary/10"
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">add</span>
              </div>
              <span className="font-headline font-bold text-primary">{t("welcome.newVault")}</span>
            </button>

            <button
              onClick={handleOpenFile}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-secondary-container/20 hover:bg-secondary-container/40 transition-all group border border-secondary-container/20"
            >
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-on-secondary shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">folder_open</span>
              </div>
              <span className="font-headline font-bold text-secondary">{t("welcome.openLocalFile")}</span>
            </button>

            <button
              onClick={() => setShowGitSetup(true)}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-surface-container-highest hover:bg-surface-container-high transition-all group border border-outline-variant/30"
            >
              <div className="w-14 h-14 rounded-full bg-on-surface flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">cloud_sync</span>
              </div>
              <span className="font-headline font-bold text-on-surface">{t("welcome.connectGitRepo")}</span>
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
    </div>
  );
}
