import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useVaultStore } from "./stores/vaultStore";
import { useSettingsStore } from "./stores/settingsStore";
import { WelcomeScreen } from "./components/screens/WelcomeScreen";
import { UnlockScreen } from "./components/screens/UnlockScreen";
import { MainScreen } from "./components/screens/MainScreen";
import { NewVaultScreen } from "./components/screens/NewVaultScreen";
import { ThemeProvider, ToastProvider } from "./components/common";

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
      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
        <span className="material-symbols-outlined animate-spin text-primary text-5xl">
          progress_activity
        </span>
        <div className="text-center">
          <p className="font-headline font-bold text-on-surface">{loading.message}</p>
          {loading.subMessage && (
            <p className="text-sm text-on-surface-variant mt-1">{loading.subMessage}</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("welcome");
  const [pendingVaultPath, setPendingVaultPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: false, message: "" });

  const { vault, isUnlocked, openGitVault, createGitVault } = useVaultStore();
  const { loadSettings } = useSettingsStore();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Handle screen transitions based on vault state
  useEffect(() => {
    if (isUnlocked && vault) {
      setCurrentScreen("main");
    }
  }, [isUnlocked, vault]);

  const handleOpenVault = (path: string) => {
    setPendingVaultPath(path);
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
    setPendingVaultPath(null);
  };

  const handleBack = () => {
    setCurrentScreen("welcome");
    setPendingVaultPath(null);
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
      message: "Opening Vault from Git",
      subMessage: "Cloning repository and decrypting...",
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
      message: "Creating Vault in Git Repository",
      subMessage: "Initializing repository and encrypting vault...",
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

          {currentScreen === "unlock" && pendingVaultPath && (
            <UnlockScreen
              vaultPath={pendingVaultPath}
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
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
