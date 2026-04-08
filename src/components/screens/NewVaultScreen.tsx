import { useState } from "react"
import { save } from "@tauri-apps/plugin-dialog"
import { Info, LockOpen, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { AppHeader, AppFooter } from "../layout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "../../i18n"

interface NewVaultScreenProps {
  onCreated: () => void
  onBack: () => void
}

export function NewVaultScreen({ onCreated, onBack }: NewVaultScreenProps) {
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { createVault } = useVaultStore()
  const { t } = useTranslation()

  const getPasswordStrength = () => {
    let strength = 0
    if (password.length >= 8) strength += 20
    if (password.length >= 12) strength += 20
    if (/[A-Z]/.test(password)) strength += 20
    if (/[a-z]/.test(password)) strength += 10
    if (/[0-9]/.test(password)) strength += 15
    if (/[^A-Za-z0-9]/.test(password)) strength += 15
    return Math.min(100, strength)
  }

  const getStrengthLabel = () => {
    const strength = getPasswordStrength()
    if (strength < 40) return t("newVault.strength.weak")
    if (strength < 70) return t("newVault.strength.medium")
    if (strength < 90) return t("newVault.strength.strong")
    return t("newVault.strength.veryStrong")
  }

  const handleBrowse = async () => {
    const selected = await save({
      defaultPath: name || "vault",
      filters: [{ name: "mmpassword Vault", extensions: ["mmp"] }],
    })
    if (selected && typeof selected === "string") {
      setPath(selected)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!name.trim()) { setError(t("newVault.error.nameRequired")); return }
    if (!path) { setError(t("newVault.error.locationRequired")); return }
    if (password.length < 8) { setError(t("newVault.error.passwordLength")); return }
    if (password !== confirmPassword) { setError(t("newVault.error.passwordMismatch")); return }

    setIsSubmitting(true)
    try {
      await createVault(name, password, path)
      onCreated()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const strength = getPasswordStrength()

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-primary rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-secondary rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-2xl bg-card rounded-xl shadow-sm border overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b bg-muted/30">
            <h1 className="font-headline font-bold text-2xl tracking-tight">
              {t("newVault.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("newVault.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-10 overflow-y-auto max-h-[60vh]">
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="font-headline font-semibold text-lg">
                  {t("newVault.vaultInfo")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {t("newVault.vaultName")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-accent border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 focus:bg-card transition-all duration-200 outline-none"
                    placeholder={t("newVault.vaultNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {t("newVault.saveLocation")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={path}
                      className="flex-grow bg-accent border-none rounded-lg px-4 py-3 text-muted-foreground text-sm truncate focus:outline-none cursor-default"
                      placeholder={t("newVault.browsePlaceholder")}
                      readOnly
                    />
                    <Button type="button" variant="outline" onClick={handleBrowse}>
                      {t("newVault.browse")}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <LockOpen className="h-5 w-5 text-primary" />
                <h2 className="font-headline font-semibold text-lg">
                  {t("newVault.setMasterPassword")}
                </h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {t("newVault.masterPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-accent border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 focus:bg-card transition-all duration-200 outline-none tracking-widest text-lg"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {t("newVault.confirmPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-accent border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/40 focus:bg-card transition-all duration-200 outline-none tracking-widest text-lg"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {password && (
                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("newVault.passwordStrength")}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          strength < 40
                            ? "bg-destructive/10 text-destructive"
                            : strength < 70
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {getStrengthLabel()}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-accent rounded-full overflow-hidden flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-full flex-1 rounded-full transition-all",
                            i < strength / 20 ? "bg-primary" : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic px-1">
                      {t("newVault.passwordTip")}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{t("newVault.zeroKnowledge")}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("newVault.zeroKnowledgeDesc")}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 rounded-lg text-destructive text-sm">{error}</div>
            )}
          </form>

          <div className="px-8 py-6 bg-muted/30 border-t flex items-center justify-end gap-4">
            <Button variant="ghost" onClick={onBack}>
              {t("newVault.cancel")}
            </Button>
            <Button
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !name || !path || !password || password !== confirmPassword}
              className="bg-primary-gradient"
            >
              {isSubmitting ? t("newVault.creating") : t("newVault.createVault")}
            </Button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
