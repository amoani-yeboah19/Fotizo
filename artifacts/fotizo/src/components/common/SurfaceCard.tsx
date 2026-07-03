import { forwardRef, memo, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// The app's standard white surface. Callers add their own padding/overflow via className.
export const SurfaceCard = memo(
  forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("surface", className)} {...props} />
  )),
);
SurfaceCard.displayName = "SurfaceCard";
