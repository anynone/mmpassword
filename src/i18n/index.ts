import { useSettingsStore } from "../stores/settingsStore";
import { translations } from "./translations";

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const value = translations[language]?.[key] ?? translations.en[key] ?? key;
    if (!params) return value;
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
      value
    );
  };

  return { t, language };
}
