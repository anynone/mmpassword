import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, options, placeholder, className = "", ...props },
    ref
  ) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full bg-surface-container-highest border-none rounded-lg
              px-4 py-3 text-on-surface appearance-none cursor-pointer
              focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest
              transition-all duration-200 outline-none
              ${error ? "ring-2 ring-error/50" : ""}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
            <span className="material-symbols-outlined">expand_more</span>
          </span>
        </div>
        {error && <p className="text-xs text-error px-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
