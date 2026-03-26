import { InputHTMLAttributes, forwardRef, useState } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconClick,
      className = "",
      type = "text",
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">{leftIcon}</span>
            </span>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full bg-surface-container-highest border-none rounded-lg
              px-4 py-3 text-on-surface
              focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest
              transition-all duration-200 outline-none
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon || isPassword ? "pr-10" : ""}
              ${error ? "ring-2 ring-error/50" : ""}
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          )}
          {rightIcon && !isPassword && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">{rightIcon}</span>
            </button>
          )}
        </div>
        {error && <p className="text-xs text-error px-1">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-on-surface-variant px-1">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
