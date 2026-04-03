import { useState } from "react";
import { useVaultStore } from "../../stores/vaultStore";
import { useTranslation } from "../../i18n";

interface UnlockScreenProps {
  vaultPath: string;
  onUnlock: () => void;
  onBack: () => void;
}

export function UnlockScreen({ vaultPath, onUnlock, onBack }: UnlockScreenProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { unlockVault } = useVaultStore();
  const { t } = useTranslation();

  const vaultName = vaultPath.split("/").pop()?.replace(".mmp", "") || "Vault";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await unlockVault(vaultPath, password);
      onUnlock();
    } catch (err) {
      setError(t("unlock.invalidPassword"));
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-2 bg-surface/80 backdrop-blur-xl border-b border-surface-container-high/30">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">lock</span>
          <span className="text-lg font-headline font-extrabold tracking-tight text-on-surface">
            mmpassword
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              <span className="text-sm font-medium">{t("unlock.backToWelcome")}</span>
            </button>
          </div>

          {/* Unlock Card */}
          <div className="bg-surface-container-lowest rounded-xl p-10 shadow-ambient border border-outline-variant/10">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                <span
                  className="material-symbols-outlined text-primary text-5xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lock
                </span>
              </div>

              <h1 className="text-2xl font-headline font-bold text-on-surface mb-1">
                {vaultName}
              </h1>
              <p className="text-on-surface-variant text-sm mb-10">
                {t("unlock.enterPassword")}
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="text-left">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2 px-1"
                  >
                    {t("unlock.masterPassword")}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 px-4 bg-surface-container-highest border-none rounded-lg text-lg tracking-widest focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline"
                      placeholder="••••••••••••"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-lowest/50"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                      <span className="text-xs font-medium">
                        {showPassword ? t("unlock.hide") : t("unlock.show")}
                      </span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-error text-sm text-center">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !password}
                  className="w-full h-14 bg-primary-gradient text-on-primary font-headline font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-xl">lock_open</span>
                  {isSubmitting ? t("unlock.unlocking") : t("unlock.unlockVault")}
                </button>
              </form>

              {/* Security Notice */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  ))}
                </div>
                <span className="text-xs text-on-surface-variant font-medium">
                  {t("unlock.remainingAttempts")} <span className="text-on-surface font-bold">5/5</span>
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Links */}
          <div className="mt-8 flex justify-center gap-6">
            <button className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors">
              {t("unlock.forgotPassword")}
            </button>
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
    </div>
  );
}
