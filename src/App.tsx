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

  const { vault, isUnlocked } = useVaultStore();
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

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen bg-surface font-body text-on-surface antialiased">
          {currentScreen === "welcome" && (
            <WelcomeScreen
              onOpenVault={handleOpenVault}
              onCreateVault={handleCreateVault}
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
