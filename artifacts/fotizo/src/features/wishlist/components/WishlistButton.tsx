import { Heart } from "lucide-react";
import { useWishlist, type WishlistItem } from "@/contexts/WishlistContext";
export function WishlistButton({
  item,
  className = "",
}: {
  item: WishlistItem;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const saved = has(item);
  return (
    <button
      type="button"
      aria-label={`${saved ? "Remove" : "Save"} ${item.title} ${saved ? "from" : "to"} wishlist`}
      aria-pressed={saved}
      title={saved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      className={`inline-flex items-center justify-center rounded-full bg-white/90 p-2 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${saved ? "text-rose-600" : "text-muted-foreground hover:text-rose-600"} ${className}`}
    >
      <Heart
        aria-hidden="true"
        className={`h-5 w-5 ${saved ? "fill-current" : ""}`}
      />
    </button>
  );
}
