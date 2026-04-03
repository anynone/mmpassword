import { useTranslation } from "../../i18n";

export function AboutSettings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h3 className="text-base font-headline font-bold text-on-surface">{t("settings.about")}</h3>

      <div className="flex flex-col items-center py-6 space-y-4">
        {/* App Icon */}
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-on-primary text-4xl">lock</span>
        </div>

        {/* App Name */}
        <div className="text-center">
          <h4 className="text-xl font-headline font-bold text-on-surface">{t("app.name")}</h4>
          <p className="text-sm text-on-surface-variant mt-1">v0.1.0</p>
        </div>

        {/* Description */}
        <p className="text-sm text-on-surface-variant text-center max-w-sm">
          {t("app.description")}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {["Tauri 2.0", "React", "Rust", "ChaCha20-Poly1305"].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 text-xs font-medium rounded-full bg-surface-container-highest text-on-surface-variant"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
