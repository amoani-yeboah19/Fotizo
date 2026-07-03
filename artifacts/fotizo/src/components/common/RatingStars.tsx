import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value?: number;
  reviewCount?: number;
  /** When set, renders this many filled stars (e.g. testimonials) instead of the compact form. */
  count?: number;
  starClassName?: string;
  className?: string;
}

export function RatingStars({ value, reviewCount, count, starClassName, className }: RatingStarsProps) {
  if (count != null) {
    return (
      <span className={cn("inline-flex gap-1", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Star key={i} className={cn("fill-accent text-accent", starClassName ?? "w-5 h-5")} />
        ))}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Star className={cn("fill-accent text-accent", starClassName ?? "w-3.5 h-3.5 mr-1.5")} />
      <span className="font-medium">{value}</span>
      {reviewCount != null && (
        <span className="text-muted-foreground font-normal ml-1">({reviewCount})</span>
      )}
    </span>
  );
}
