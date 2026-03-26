interface StatusBarProps {
  status?: "secure" | "unlocked" | "locked";
  version?: string;
}

export function StatusBar({
  status = "secure",
  version = "0.1.0",
}: StatusBarProps) {
  const statusConfig = {
    secure: { text: "Status: Secure", color: "text-emerald-600", icon: "verified_user" },
    unlocked: { text: "Status: Unlocked", color: "text-amber-600", icon: "lock_open" },
    locked: { text: "Status: Locked", color: "text-on-surface-variant", icon: "lock" },
  };

  const { text, color, icon } = statusConfig[status];

  return (
    <footer className="flex justify-between items-center px-4 h-8 bg-surface-container-low border-t border-surface-variant/20 text-xs">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
        <span className={`font-bold ${color}`}>{text}</span>
      </div>
      <div className="text-on-surface-variant">v{version}</div>
    </footer>
  );
}
