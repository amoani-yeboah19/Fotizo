import { cn } from "@/lib/utils";

// Letter avatar for users without a photo: shows up to two initials on a
// brand-tinted circle. Use wherever a user avatar would render.
export function InitialsAvatar({ name, className }: { name?: string; className?: string }) {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join(("")) || "?";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold select-none",
        className,
      )}
    >
      {initials}
    </span>
  );
}
