import { memo, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "./SurfaceCard";

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional supporting line under the value (e.g. a trend or caption). */
  sub?: ReactNode;
  /** Optional leading icon; when present the card uses the horizontal (icon-left) layout. */
  icon?: ReactNode;
  iconClassName?: string;
  valueClassName?: string;
  className?: string;
}

export const StatCard = memo(function StatCard({
  label,
  value,
  sub,
  icon,
  iconClassName,
  valueClassName,
  className,
}: StatCardProps) {
  if (icon) {
    return (
      <SurfaceCard className={cn("p-6", className)}>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              iconClassName,
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <h4 className={cn("text-2xl font-bold", valueClassName)}>{value}</h4>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className={cn("p-6", className)}>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <h4 className={cn("text-3xl font-bold", valueClassName)}>{value}</h4>
      {sub}
    </SurfaceCard>
  );
});
