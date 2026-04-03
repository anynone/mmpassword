import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { useVaultStore } from "../../stores/vaultStore";
import { useTranslation } from "../../i18n";

interface NewVaultScreenProps {
  onCreated: () => void;
  onBack: () => void;
}

export function NewVaultScreen({ onCreated, onBack }: NewVaultScreenProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createVault } = useVaultStore();
  const { t } = useTranslation();

  const getPasswordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
    return Math.min(100, strength);
  };

  const getStrengthLabel = () => {
    const strength = getPasswordStrength();
    if (strength < 40) return t("newVault.strength.weak");
    if (strength < 70) return t("newVault.strength.medium");
    if (strength < 90) return t("newVault.strength.strong");
    return t("newVault.strength.veryStrong");
  };

  const handleBrowse = async () => {
    const selected = await save({
      defaultPath: name || "vault",
      filters: [{ name: "mmpassword Vault", extensions: ["mmp"] }],
    });

    if (selected && typeof selected === "string") {
      setPath(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError(t("newVault.error.nameRequired"));
      return;
    }
    if (!path) {
      setError(t("newVault.error.locationRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("newVault.error.passwordLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("newVault.error.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      await createVault(name, password, path);
      onCreated();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-container-low">
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
      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-primary rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-secondary rounded-full blur-[100px]"></div>
        </div>

        {/* New Vault Modal */}
        <div className="relative z-10 w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-ambient ghost-border overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="px-8 py-6 glass-header border-b border-outline-variant/10">
            <h1 className="font-headline font-bold text-2xl tracking-tight text-on-surface">
              {t("newVault.title")}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {t("newVault.subtitle")}
            </p>
          </div>

          {/* Modal Content */}
          <form onSubmit={handleSubmit} className="p-8 space-y-10 overflow-y-auto max-h-[60vh]">
            {/* Vault Information */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">info</span>
                <h2 className="font-headline font-semibold text-lg text-on-surface">
                  {t("newVault.vaultInfo")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                    {t("newVault.vaultName")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all duration-200 outline-none"
                    placeholder={t("newVault.vaultNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                    {t("newVault.saveLocation")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      className="flex-grow bg-surface-container-highest border-none rounded-lg px-4 py-3 text-on-surface-variant text-sm truncate focus:outline-none cursor-default"
                      placeholder={t("newVault.browsePlaceholder")}
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={handleBrowse}
                      className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-sm rounded-lg transition-all duration-200"
                    >
                      {t("newVault.browse")}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Set Master Password */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">lock_open</span>
                <h2 className="font-headline font-semibold text-lg text-on-surface">
                  {t("newVault.setMasterPassword")}
                </h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2 relative">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                    {t("newVault.masterPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all duration-200 outline-none tracking-widest text-lg"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                    {t("newVault.confirmPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all duration-200 outline-none tracking-widest text-lg"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">
                        {showConfirmPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Password Strength Bar */}
                {password && (
                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-medium text-on-surface-variant">
                        {t("newVault.passwordStrength")}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          getPasswordStrength() < 40
                            ? "bg-error-container text-on-error-container"
                            : getPasswordStrength() < 70
                            ? "bg-tertiary-container text-on-tertiary-container"
                            : "bg-primary-fixed text-on-primary-fixed-variant"
                        }`}
                      >
                        {getStrengthLabel()}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-full flex-1 rounded-full transition-all ${
                            i < getPasswordStrength() / 20 ? "bg-primary" : "bg-surface-container-highest"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic px-1">
                      {t("newVault.passwordTip")}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Security Feature Card */}
            <div className="p-4 bg-surface-container rounded-lg flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-on-primary-fixed-variant/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-on-primary-fixed-variant">
                  verified_user
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-on-surface">{t("newVault.zeroKnowledge")}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t("newVault.zeroKnowledgeDesc")}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-error-container/20 rounded-lg text-error text-sm">{error}</div>
            )}
          </form>

          {/* Modal Footer */}
          <div className="px-8 py-6 bg-surface-container-low border-t border-outline-variant/10 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 font-semibold text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-200"
            >
              {t("newVault.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !name || !path || !password || password !== confirmPassword}
              className="px-8 py-2.5 bg-primary-gradient text-on-primary font-bold text-sm rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("newVault.creating") : t("newVault.createVault")}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-between items-center px-4 h-8 bg-surface-container-low border-t border-surface-variant/20 text-xs">
        <div className="flex gap-4">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t("status.secure")}</span>
        </div>
        <div className="text-on-surface-variant">v0.1.0</div>
      </footer>
    </div>
  );
}
