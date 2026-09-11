import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";
import { useVaultStore } from "./stores/vaultStore";
import { useSettingsStore } from "./stores/settingsStore";
import { WelcomeScreen } from "./components/screens/WelcomeScreen";
import { UnlockScreen, type PendingVault } from "./components/screens/UnlockScreen";
import { MainScreen } from "./components/screens/MainScreen";
import { NewVaultScreen } from "./components/screens/NewVaultScreen";
import { ThemeProvider, ToastProvider } from "./components/common";
import { Toaster } from "@/components/ui/sonner";
import { useTranslation } from "./i18n";
import { toVaultOpenTarget, type VaultOpenTarget } from "./types";

export type AppScreen = "welcome" | "unlock" | "main" | "newVault";

interface LoadingState {
  isLoading: boolean;
  message: string;
  subMessage?: string;
}

function LoadingOverlay({ loading }: { loading: LoadingState }) {
  if (!loading.isLoading) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-headline font-bold">{loading.message}</p>
          {loading.subMessage && (
            <p className="text-sm text-muted-foreground mt-1">{loading.subMessage}</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("welcome");
  const [pendingVault, setPendingVault] = useState<PendingVault | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: false, message: "" });

  const { vault, isUnlocked, isLocked, openGitVault, createGitVault, switchVault } = useVaultStore();
  const currentVaultTarget = useVaultStore((s) => s.currentVaultTarget);
  const hasOpenVaults = useVaultStore((s) => s.hasOpenVaults);
  const hasUnlockedVaults = useVaultStore((s) =>
    s.tabs.some((tab) => tab.status === "unlocked")
  );
  const { loadSettings, openLastVault, lastVaultPath, lastGitVault, openVaults } = useSettingsStore();
  const restoreTabs = useVaultStore((s) => s.restoreTabs);
  const { t } = useTranslation();
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(() => setSettingsLoaded(true));
  }, [loadSettings]);

  // Restore the previous session: every vault tab that was open at exit is
  // brought back as a locked tab, and the most recently opened one gets the
  // unlock prompt. Falls back to the legacy single-vault auto-open.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (currentScreen !== "welcome" || hasOpenVaults) return;

    if (openLastVault) {
      const targets = (openVaults ?? [])
        .map(toVaultOpenTarget)
        .filter((target): target is VaultOpenTarget => target !== null);
      if (targets.length > 0) {
        restoreTabs(targets);
        setPendingVault(targets[targets.length - 1]);
        setCurrentScreen("unlock");
        return;
      }

      if (lastVaultPath) {
        setPendingVault({ type: "local", path: lastVaultPath });
        setCurrentScreen("unlock");
      } else if (lastGitVault) {
        setPendingVault({ type: "git", vault: lastGitVault });
        setCurrentScreen("unlock");
      }
    } else {
      // Auto-open disabled: discard the stale session list from the last run
      invoke("clear_open_vaults").catch(console.error);
    }
  }, [settingsLoaded]);

  // Handle screen transitions based on vault state
  useEffect(() => {
    if (isUnlocked && vault) {
      setCurrentScreen("main");
    }
  }, [isUnlocked, vault]);

  // When the active vault is locked (manual lock of the last unlocked vault
  // or idle auto-lock), show the unlock screen for it; if every tab was
  // closed, go back to the welcome screen.
  useEffect(() => {
    if (isLocked && currentScreen === "main") {
      const pending = hasOpenVaults ? currentVaultTarget : null;
      if (pending) {
        setPendingVault(pending);
        setCurrentScreen("unlock");
      } else {
        setPendingVault(null);
        setCurrentScreen("welcome");
      }
    }
  }, [isLocked, currentScreen, currentVaultTarget, hasOpenVaults]);

  const handleOpenVault = (path: string) => {
    setPendingVault({ type: "local", path });
    setCurrentScreen("unlock");
  };

  const handleCreateVault = () => {
    setCurrentScreen("newVault");
  };

  const handleVaultCreated = () => {
    setCurrentScreen("main");
  };

  const handleUnlockSuccess = () => {
    setCurrentScreen("main");
  };

  const handleBack = () => {
    if (hasUnlockedVaults) {
      // Other vaults are still open: switch to one instead of leaving to welcome
      const firstUnlocked = useVaultStore
        .getState()
        .tabs.find((tab) => tab.status === "unlocked");
      if (firstUnlocked) {
        switchVault(firstUnlocked.vaultId);
      }
      setPendingVault(null);
      setCurrentScreen("main");
    } else {
      setCurrentScreen("welcome");
      setPendingVault(null);
    }
  };

  // Handle opening a vault from Git repository
  const handleOpenGitVault = async (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    password: string
  ) => {
    setLoading({
      isLoading: true,
      message: t("app.openingGitVault"),
      subMessage: t("app.openingGitVaultDesc"),
    });
    try {
      await openGitVault(repoUrl, branch, vaultPath, keyPath, password);
      setCurrentScreen("main");
    } catch (error) {
      console.error("Failed to open Git vault:", error);
      alert(`Failed to open vault: ${error}`);
    } finally {
      setLoading({ isLoading: false, message: "" });
    }
  };

  // Handle creating a new vault in Git repository
  const handleCreateGitVault = async (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    name: string,
    password: string
  ) => {
    setLoading({
      isLoading: true,
      message: t("app.creatingGitVault"),
      subMessage: t("app.creatingGitVaultDesc"),
    });
    try {
      await createGitVault(repoUrl, branch, vaultPath, keyPath, name, password);
      setCurrentScreen("main");
    } catch (error) {
      console.error("Failed to create Git vault:", error);
      alert(`Failed to create vault: ${error}`);
    } finally {
      setLoading({ isLoading: false, message: "" });
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen bg-surface font-body text-on-surface antialiased">
          {currentScreen === "welcome" && (
            <WelcomeScreen
              onOpenVault={handleOpenVault}
              onCreateVault={handleCreateVault}
              onOpenGitVault={handleOpenGitVault}
              onCreateGitVault={handleCreateGitVault}
            />
          )}

          {currentScreen === "unlock" && pendingVault && (
            <UnlockScreen
              pending={pendingVault}
              onUnlock={handleUnlockSuccess}
              onBack={handleBack}
            />
          )}

          {currentScreen === "newVault" && (
            <NewVaultScreen
              onCreated={handleVaultCreated}
              onBack={handleBack}
            />
          )}

          {currentScreen === "main" && (
            <MainScreen
              onAddLocalVault={handleOpenVault}
              onCreateVault={handleCreateVault}
              onOpenGitVault={handleOpenGitVault}
              onCreateGitVault={handleCreateGitVault}
            />
          )}
        </div>

        {/* Global Loading Overlay */}
        <LoadingOverlay loading={loading} />
        <Toaster richColors position="bottom-right" />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
