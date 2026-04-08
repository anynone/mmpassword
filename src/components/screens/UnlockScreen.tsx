import { useState } from "react"
import { ArrowLeft, Lock, LockOpen, Eye, EyeOff, Loader2 } from "lucide-react"
import { useVaultStore } from "../../stores/vaultStore"
import { AppHeader, AppFooter } from "../layout"
import { Button } from "@/components/ui/button"
import { useTranslation } from "../../i18n"

interface UnlockScreenProps {
  vaultPath: string
  onUnlock: () => void
  onBack: () => void
}

export function UnlockScreen({ vaultPath, onUnlock, onBack }: UnlockScreenProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { unlockVault } = useVaultStore()
  const { t } = useTranslation()

  const vaultName = vaultPath.split("/").pop()?.replace(".mmp", "") || "Vault"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await unlockVault(vaultPath, password)
      onUnlock()
    } catch (err) {
      setError(t("unlock.invalidPassword"))
      setPassword("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">{t("unlock.backToWelcome")}</span>
            </button>
          </div>

          <div className="bg-card rounded-xl p-10 shadow-sm border">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                <Lock className="h-10 w-10 text-primary" />
              </div>

              <h1 className="text-2xl font-headline font-bold mb-1">
                {vaultName}
              </h1>
              <p className="text-muted-foreground text-sm mb-10">
                {t("unlock.enterPassword")}
              </p>

              <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="text-left">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1"
                  >
                    {t("unlock.masterPassword")}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 px-4 bg-accent border-none rounded-lg text-lg tracking-widest focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all placeholder:text-muted-foreground/40"
                      placeholder="••••••••••••"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-2 py-1 rounded bg-card/50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                      <span className="text-xs font-medium">
                        {showPassword ? t("unlock.hide") : t("unlock.show")}
                      </span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-destructive text-sm text-center">{error}</div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !password}
                  className="w-full h-14 bg-primary-gradient text-primary-foreground font-headline font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <LockOpen className="h-5 w-5 mr-2" />
                  )}
                  {isSubmitting ? t("unlock.unlocking") : t("unlock.unlockVault")}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("unlock.remainingAttempts")} <span className="font-bold">5/5</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-6">
            <button className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
              {t("unlock.forgotPassword")}
            </button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
