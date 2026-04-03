import { useState } from "react";
import { Modal } from "../common/Modal";
import { GeneralSettings } from "./GeneralSettings";
import { SecuritySettings } from "./SecuritySettings";
import { AboutSettings } from "./AboutSettings";
import { useTranslation } from "../../i18n";

type SettingsCategory = "general" | "security" | "about";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");

  const categories: { id: SettingsCategory; label: string; icon: string }[] = [
    { id: "general", label: t("settings.general"), icon: "tune" },
    { id: "security", label: t("settings.security"), icon: "shield" },
    { id: "about", label: t("settings.about"), icon: "info" },
  ];

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralSettings />;
      case "security":
        return <SecuritySettings />;
      case "about":
        return <AboutSettings />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("settings.title")} size="2xl">
      <div className="flex gap-6 -m-6">
        {/* Left sidebar - category navigation */}
        <nav className="w-48 shrink-0 bg-surface-container-low border-r border-outline-variant/10 -my-6 py-6 px-3">
          <ul className="space-y-1">
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150 text-left
                    ${activeCategory === cat.id
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                    }
                  `}
                >
                  <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right content area */}
        <div className="flex-1 min-w-0 py-1 pr-2">
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
}
