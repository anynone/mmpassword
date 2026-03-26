interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const getStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
    return Math.min(100, strength);
  };

  const getLabel = () => {
    const strength = getStrength();
    if (strength < 40) return "Weak";
    if (strength < 70) return "Medium";
    if (strength < 90) return "Strong";
    return "Very Strong";
  };

  const strength = getStrength();
  const label = getLabel();

  if (!password) return null;

  return (
    <div className="pt-2 space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-medium text-on-surface-variant">
          Password Strength
        </span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            strength < 40
              ? "bg-error-container text-on-error-container"
              : strength < 70
              ? "bg-tertiary-container text-on-tertiary-container"
              : "bg-primary-fixed text-on-primary-fixed-variant"
          }`}
        >
          {label}
        </span>
      </div>
      <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-all ${
              i < strength / 20 ? "bg-primary" : "bg-surface-container-highest"
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-on-surface-variant italic px-1">
        Tip: Use at least 12 characters with mixed symbols and numbers.
      </p>
    </div>
  );
}
