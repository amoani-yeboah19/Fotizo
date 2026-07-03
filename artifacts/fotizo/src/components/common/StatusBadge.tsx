import { memo } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

// Pill status badge. Colour comes from the `.badge-*` classes in index.css so the
// palette lives in one place instead of ad-hoc `bg-green-100 text-green-700` ternaries.
export const StatusBadge = memo(function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return <span className={cn("badge-status", `badge-${tone}`, className)}>{children}</span>;
});
