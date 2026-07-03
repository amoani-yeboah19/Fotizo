import { ReactNode } from "react";

// Centered full-height state used for "not found" / empty screens.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="text-center">
        {icon && <div className="mb-4 flex justify-center text-muted-foreground/40">{icon}</div>}
        <h2 className="heading-sub mb-4">{title}</h2>
        {description && <p className="text-muted-foreground mb-6">{description}</p>}
        {action}
      </div>
    </div>
  );
}
