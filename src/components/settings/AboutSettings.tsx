import { Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "../../i18n"

export function AboutSettings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h3 className="text-base font-headline font-bold">{t("settings.about")}</h3>

      <div className="flex flex-col items-center py-6 space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Lock className="h-10 w-10 text-primary-foreground" />
        </div>

        <div className="text-center">
          <h4 className="text-xl font-headline font-bold">{t("app.name")}</h4>
          <p className="text-sm text-muted-foreground mt-1">v0.1.0</p>
        </div>

        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {t("app.description")}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {["Tauri 2.0", "React", "Rust", "ChaCha20-Poly1305"].map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
