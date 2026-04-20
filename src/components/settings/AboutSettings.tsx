import { Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Modal } from "../common/Modal"
import { useTranslation } from "../../i18n"

interface AboutSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutSettings({ isOpen, onClose }: AboutSettingsProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("settings.about")} size="md">
      <div className="flex flex-col items-center py-6 space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Lock className="h-10 w-10 text-primary-foreground" />
        </div>

        <div className="text-center">
          <h4 className="text-xl font-headline font-bold">{t("app.name")}</h4>
          <p className="text-sm text-muted-foreground mt-1">v0.1.0</p>
          <p className="text-sm text-muted-foreground mt-1">谷川信息系统-技术中台</p>
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
    </Modal>
  )
}
