import { useSettingsStore } from "../../stores/settingsStore";
import { Select } from "../common/Select";
import { Toggle } from "../common/Toggle";
import { useTranslation } from "../../i18n";

export function GeneralSettings() {
  const { t } = useTranslation();
  const { theme, language, openLastVault, setTheme, setLanguage, setOpenLastVault } = useSettingsStore();

  const themeOptions = [
    { value: "light", label: t("settings.theme.light") },
    { value: "dark", label: t("settings.theme.dark") },
    { value: "system", label: t("settings.theme.system") },
  ];

  const languageOptions = [
    { value: "en", label: t("settings.language.en") },
    { value: "zh-CN", label: t("settings.language.zh-CN") },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-base font-headline font-bold text-on-surface">{t("settings.general")}</h3>

      <div className="space-y-5">
        <Select
          label={t("settings.theme")}
          options={themeOptions}
          value={theme}
          onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
        />

        <Select
          label={t("settings.language")}
          options={languageOptions}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        />

        <Toggle
          label={t("settings.openLastVault")}
          description={t("settings.openLastVault.desc")}
          checked={openLastVault}
          onChange={setOpenLastVault}
        />
      </div>
    </div>
  );
}
