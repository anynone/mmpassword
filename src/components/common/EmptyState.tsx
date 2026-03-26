import { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl text-on-surface-variant">
          {icon}
        </span>
      </div>
      <h3 className="font-headline font-semibold text-lg text-on-surface mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-on-surface-variant max-w-xs mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
