import { useSettingsStore } from "../../stores/settingsStore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Toggle } from "../common/Toggle"
import { useTranslation } from "../../i18n"

export function GeneralSettings() {
  const { t } = useTranslation()
  const { theme, language, openLastVault, setTheme, setLanguage, setOpenLastVault } = useSettingsStore()

  const themeOptions = [
    { value: "light", label: t("settings.theme.light") },
    { value: "dark", label: t("settings.theme.dark") },
    { value: "system", label: t("settings.theme.system") },
  ]

  const languageOptions = [
    { value: "en", label: t("settings.language.en") },
    { value: "zh-CN", label: t("settings.language.zh-CN") },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-base font-headline font-bold">{t("settings.general")}</h3>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>{t("settings.theme")}</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("settings.language")}</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Toggle
          label={t("settings.openLastVault")}
          description={t("settings.openLastVault.desc")}
          checked={openLastVault}
          onChange={setOpenLastVault}
        />
      </div>
    </div>
  )
}
