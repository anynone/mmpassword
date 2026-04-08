import { useState, useEffect } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { FolderOpen, CloudCog, Plus, ChevronRight, Settings } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { useSettingsStore } from "../../stores/settingsStore"
import type { VaultMeta, GitRepoMeta } from "../../types"
import { GitRepoSetup } from "../git/GitRepoSetup"
import { SettingsModal } from "../settings"
import { Modal } from "../common"
import { AppHeader, AppFooter } from "../layout"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "../../i18n"

interface WelcomeScreenProps {
  onOpenVault: (path: string) => void
  onCreateVault: () => void
  onOpenGitVault?: (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    password: string
  ) => void
  onCreateGitVault?: (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    name: string,
    password: string
  ) => void
}

export function WelcomeScreen({
  onOpenVault,
  onCreateVault,
  onOpenGitVault,
  onCreateGitVault,
}: WelcomeScreenProps) {
  const [recentVaults, setRecentVaults] = useState<VaultMeta[]>([])
  const [recentGitRepos, setRecentGitRepos] = useState<GitRepoMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showGitSetup, setShowGitSetup] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedGitRepo, setSelectedGitRepo] = useState<GitRepoMeta | null>(null)
  const [showAllVaults, setShowAllVaults] = useState(false)
  const [showAllGitRepos, setShowAllGitRepos] = useState(false)

  const { getRecentVaults } = useVaultStore()
  const { openLastVault, setOpenLastVault } = useSettingsStore()
  const { t } = useTranslation()

  useEffect(() => {
    loadRecentData()
  }, [])

  const loadRecentData = async () => {
    setIsLoading(true)
    try {
      const vaults = await getRecentVaults()
      setRecentVaults(vaults)
      const gitRepos = await invoke<GitRepoMeta[]>("get_recent_git_repos")
      setRecentGitRepos(gitRepos)
    } catch (error) {
      console.error("Failed to load recent data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "mmpassword Vault", extensions: ["mmp"] }],
    })
    if (selected && typeof selected === "string") {
      onOpenVault(selected)
    }
  }

  const handleGitSetupComplete = (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    password: string,
    isNew: boolean,
    name?: string
  ) => {
    setShowGitSetup(false)
    if (isNew && name) {
      onCreateGitVault?.(repoUrl, branch, vaultPath, keyPath, name, password)
    } else {
      onOpenGitVault?.(repoUrl, branch, vaultPath, keyPath, password)
    }
  }

  const formatLastAccessed = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return t("welcome.today")
    if (days === 1) return t("welcome.yesterday")
    if (days < 7) return t("welcome.daysAgo", { days })
    return d.toLocaleDateString()
  }

  const VaultListItem = ({ vault, onClick }: { vault: VaultMeta; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full group bg-card p-3 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border hover:border-primary/20 text-left"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{vault.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatLastAccessed(vault.lastAccessed)} •{" "}
            {vault.isGithub ? t("welcome.git") : t("welcome.localStorage")}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  )

  const GitRepoListItem = ({ repo, onClick }: { repo: GitRepoMeta; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full group bg-card p-3 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border hover:border-primary/20 text-left"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{repo.repoName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {repo.branch} • {formatLastAccessed(repo.lastAccessed)}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  )

  return (
    <div className="h-screen flex flex-col">
      <AppHeader tagline={t("app.tagline")}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </AppHeader>

      <main className="flex-1 p-6 pt-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6">
            <h1 className="text-3xl font-headline font-extrabold tracking-tight mb-1">
              {t("welcome.title")}
            </h1>
            <p className="text-muted-foreground text-base">
              {t("welcome.subtitle")}
            </p>
          </header>

          {/* Recent Vaults */}
          <section className="mb-6">
            <h3 className="font-headline font-bold flex items-center gap-2 mb-3">
              <FolderOpen className="h-5 w-5 text-primary" />
              {t("welcome.recentVaults")}
            </h3>
            {isLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : recentVaults.length > 0 ? (
              <div className="space-y-2">
                {recentVaults.slice(0, 3).map((vault) => (
                  <VaultListItem
                    key={vault.path}
                    vault={vault}
                    onClick={() => onOpenVault(vault.path)}
                  />
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
              <p className="text-muted-foreground">{t("welcome.noRecentVaults")}</p>
            )}
          </section>

          {/* Recent Git Repositories */}
          {recentGitRepos.length > 0 && (
            <section className="mb-6">
              <h3 className="font-headline font-bold flex items-center gap-2 mb-3">
                <CloudCog className="h-5 w-5 text-primary" />
                {t("welcome.recentGitRepos")}
              </h3>
              <div className="space-y-2">
                {recentGitRepos.slice(0, 3).map((repo) => (
                  <GitRepoListItem
                    key={`${repo.repoUrl}-${repo.branch}`}
                    repo={repo}
                    onClick={() => {
                      setSelectedGitRepo(repo)
                      setShowGitSetup(true)
                    }}
                  />
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
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6" />
              </div>
              <span className="font-headline font-bold text-sm text-primary">{t("welcome.newVault")}</span>
            </button>

            <button
              onClick={handleOpenFile}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-all group border border-secondary/20"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shadow-lg group-hover:scale-110 transition-transform">
                <FolderOpen className="h-6 w-6" />
              </div>
              <span className="font-headline font-bold text-sm text-secondary-foreground">{t("welcome.openLocalFile")}</span>
            </button>

            <button
              onClick={() => setShowGitSetup(true)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-accent hover:bg-accent/80 transition-all group border border-border/30"
            >
              <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center text-background shadow-lg group-hover:scale-110 transition-transform">
                <CloudCog className="h-6 w-6" />
              </div>
              <span className="font-headline font-bold text-sm">{t("welcome.connectGitRepo")}</span>
            </button>
          </div>

          {/* Options */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="open-last"
              checked={openLastVault}
              onCheckedChange={(checked) => setOpenLastVault(checked === true)}
            />
            <label
              htmlFor="open-last"
              className="text-sm font-medium text-muted-foreground cursor-pointer select-none"
            >
              {t("welcome.openLastVault")}
            </label>
          </div>
        </div>
      </main>

      <AppFooter />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {showGitSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <GitRepoSetup
              onComplete={handleGitSetupComplete}
              onBack={() => {
                setShowGitSetup(false)
                setSelectedGitRepo(null)
              }}
              initialRepo={selectedGitRepo}
            />
          </div>
        </div>
      )}

      <Modal
        isOpen={showAllVaults}
        onClose={() => setShowAllVaults(false)}
        title={t("welcome.allRecentVaults")}
        size="lg"
      >
        <div className="space-y-2">
          {recentVaults.map((vault) => (
            <VaultListItem
              key={vault.path}
              vault={vault}
              onClick={() => {
                setShowAllVaults(false)
                onOpenVault(vault.path)
              }}
            />
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showAllGitRepos}
        onClose={() => setShowAllGitRepos(false)}
        title={t("welcome.allRecentGitRepos")}
        size="lg"
      >
        <div className="space-y-2">
          {recentGitRepos.map((repo) => (
            <GitRepoListItem
              key={`${repo.repoUrl}-${repo.branch}`}
              repo={repo}
              onClick={() => {
                setShowAllGitRepos(false)
                setSelectedGitRepo(repo)
                setShowGitSetup(true)
              }}
            />
          ))}
        </div>
      </Modal>
    </div>
  )
}
