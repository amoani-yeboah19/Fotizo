import { ReactNode } from "react";

// Header for landing/home sections: title + optional subtitle + optional right-aligned action.
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
      <div>
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
