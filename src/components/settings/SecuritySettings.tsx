import { useSettingsStore } from "../../stores/settingsStore"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "../../i18n"

export function SecuritySettings() {
  const { t } = useTranslation()
  const {
    autoLockMinutes,
    clipboardClearSeconds,
    setAutoLockMinutes,
    setClipboardClearSeconds,
  } = useSettingsStore()

  return (
    <div className="space-y-6">
      <h3 className="text-base font-headline font-bold">{t("settings.security")}</h3>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="auto-lock">{t("settings.autoLock")}</Label>
          <Input
            id="auto-lock"
            type="number"
            min={1}
            max={120}
            value={autoLockMinutes}
            onChange={(e) => setAutoLockMinutes(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <p className="text-xs text-muted-foreground">{t("settings.autoLock.hint")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clipboard-clear">{t("settings.clipboardClear")}</Label>
          <Input
            id="clipboard-clear"
            type="number"
            min={5}
            max={300}
            value={clipboardClearSeconds}
            onChange={(e) => setClipboardClearSeconds(Math.max(5, parseInt(e.target.value) || 30))}
          />
          <p className="text-xs text-muted-foreground">{t("settings.clipboardClear.hint")}</p>
        </div>
      </div>
    </div>
  )
}
