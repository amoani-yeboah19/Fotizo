import { cn } from "@/lib/utils";
import { InitialsAvatar } from "./InitialsAvatar";

// Renders a user's photo if they have one, otherwise a letter avatar. Pass the
// size and text-size in className (e.g. "w-12 h-12 text-base"), matching how
// InitialsAvatar is used elsewhere. New Fotizo users have no photo by design.
export function Avatar({
  src,
  name,
  className,
}: {
  src?: string;
  name?: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        loading="lazy"
        decoding="async"
        src={src}
        alt={name ?? ""}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return <InitialsAvatar name={name} className={className} />;
}
