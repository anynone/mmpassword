import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  const { vault, isUnlocked, openGitVault, createGitVault } = useVaultStore();
  const { loadSettings, openLastVault, lastVaultPath, lastGitVault } = useSettingsStore();
  const { t } = useTranslation();
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(() => setSettingsLoaded(true));
  }, [loadSettings]);

  // Auto-open last vault on startup (local or Git)
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!openLastVault || currentScreen !== "welcome") return;

    if (lastVaultPath) {
      setPendingVault({ type: "local", path: lastVaultPath });
      setCurrentScreen("unlock");
    } else if (lastGitVault) {
      setPendingVault({ type: "git", vault: lastGitVault });
      setCurrentScreen("unlock");
    }
  }, [settingsLoaded]);

  // Handle screen transitions based on vault state
  useEffect(() => {
    if (isUnlocked && vault) {
      setCurrentScreen("main");
    }
  }, [isUnlocked, vault]);

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

  const handleLock = () => {
    setCurrentScreen("welcome");
    setPendingVault(null);
  };

  const handleBack = () => {
    setCurrentScreen("welcome");
    setPendingVault(null);
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
            <MainScreen onLock={handleLock} />
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
