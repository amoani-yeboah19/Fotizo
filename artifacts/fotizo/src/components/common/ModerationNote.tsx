import type { ListingModeration } from "@/types";

/** Tells a listing's owner when Fotizo is reviewing it or has taken it down, and why. */
export function ModerationNote({ moderation }: { moderation?: ListingModeration }) {
  if (!moderation) return null;
  if (moderation.review === "rejected" || moderation.held)
    return (
      <p className="mt-1 max-w-xs text-xs text-destructive">
        Taken down by Fotizo{moderation.reason ? `: ${moderation.reason}` : "."} Edit the listing to resubmit it.
      </p>
    );
  if (moderation.review === "pending") return <p className="mt-1 text-xs text-muted-foreground">In review</p>;
  return null;
}
