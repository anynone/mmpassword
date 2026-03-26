import { ButtonHTMLAttributes, forwardRef } from "react";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "default" | "filled" | "tonal" | "outlined";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  tooltip?: string;
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "w-8 h-8 text-lg",
  md: "w-10 h-10 text-xl",
  lg: "w-12 h-12 text-2xl",
};

const variantStyles: Record<IconButtonVariant, string> = {
  default: "text-on-surface-variant hover:bg-surface-container-high",
  filled: "bg-primary text-on-primary hover:bg-primary/90",
  tonal: "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80",
  outlined: "border border-outline text-primary hover:bg-primary/10",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { icon, size = "md", variant = "default", tooltip, className = "", ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        title={tooltip}
        className={`
          inline-flex items-center justify-center rounded-full
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeStyles[size]}
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
