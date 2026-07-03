import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// The app's standard white surface. Callers add their own padding/overflow via className.
export const SurfaceCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("bg-white rounded-2xl border border-border shadow-sm", className)}
      {...props}
    />
  ),
);
SurfaceCard.displayName = "SurfaceCard";
