import { useSettingsStore } from "../../stores/settingsStore";
import { Input } from "../common/Input";
import { useTranslation } from "../../i18n";

export function SecuritySettings() {
  const { t } = useTranslation();
  const {
    autoLockMinutes,
    clipboardClearSeconds,
    setAutoLockMinutes,
    setClipboardClearSeconds,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <h3 className="text-base font-headline font-bold text-on-surface">{t("settings.security")}</h3>

      <div className="space-y-5">
        <Input
          label={t("settings.autoLock")}
          type="number"
          min={1}
          max={120}
          value={autoLockMinutes}
          onChange={(e) => setAutoLockMinutes(Math.max(1, parseInt(e.target.value) || 1))}
          hint={t("settings.autoLock.hint")}
        />

        <Input
          label={t("settings.clipboardClear")}
          type="number"
          min={5}
          max={300}
          value={clipboardClearSeconds}
          onChange={(e) => setClipboardClearSeconds(Math.max(5, parseInt(e.target.value) || 30))}
          hint={t("settings.clipboardClear.hint")}
        />
      </div>
    </div>
  );
}
