import { useEffect, useState } from "react";
import { useVaultStore } from "./stores/vaultStore";
import { useSettingsStore } from "./stores/settingsStore";
import { WelcomeScreen } from "./components/screens/WelcomeScreen";
import { UnlockScreen } from "./components/screens/UnlockScreen";
import { MainScreen } from "./components/screens/MainScreen";
import { NewVaultScreen } from "./components/screens/NewVaultScreen";
import { ThemeProvider, ToastProvider } from "./components/common";

export type AppScreen = "welcome" | "unlock" | "main" | "newVault";

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("welcome");
  const [pendingVaultPath, setPendingVaultPath] = useState<string | null>(null);

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
    try {
      await openGitVault(repoUrl, branch, vaultPath, keyPath, password);
      setCurrentScreen("main");
    } catch (error) {
      console.error("Failed to open Git vault:", error);
      alert(`Failed to open vault: ${error}`);
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
    try {
      await createGitVault(repoUrl, branch, vaultPath, keyPath, name, password);
      setCurrentScreen("main");
    } catch (error) {
      console.error("Failed to create Git vault:", error);
      alert(`Failed to create vault: ${error}`);
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
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
