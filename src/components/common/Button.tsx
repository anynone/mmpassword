import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
  iconPosition?: "left" | "right";
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-gradient text-on-primary font-bold shadow-md hover:shadow-lg active:scale-[0.98]",
  secondary:
    "bg-surface-container-high text-on-surface hover:bg-surface-container-highest",
  outline:
    "border border-outline text-primary hover:bg-primary/10 bg-transparent",
  ghost: "text-on-surface-variant hover:bg-surface-container-high",
  danger: "bg-error text-on-error hover:bg-error/90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-6 py-2.5 text-base rounded-lg gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-semibold
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <span className="material-symbols-outlined animate-spin text-lg">
            progress_activity
          </span>
        )}
        {!loading && icon && iconPosition === "left" && (
          <span className="material-symbols-outlined text-lg">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === "right" && (
          <span className="material-symbols-outlined text-lg">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
