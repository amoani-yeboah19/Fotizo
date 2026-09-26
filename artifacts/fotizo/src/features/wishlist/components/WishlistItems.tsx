import { AUTH_USE_MOCKS } from "@/api";
import { Loading } from "@/components/common/QueryStates";
import { useWishlistView as useWishlist } from "@/features/wishlist/hooks/useWishlistView";
import { Link } from "wouter";
import { Heart } from "lucide-react";
import { wishlistKey } from "@/contexts/WishlistContext";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "./WishlistButton";
export function WishlistItems() {
  const { items, storageError, isLoading, isError, retry } = useWishlist();
  if (isLoading) return <Loading label="Loading wishlist…" />;
  if (isError) return <div role="alert"><p>Unable to load your wishlist.</p><Button variant="outline" onClick={retry}>Try again</Button></div>;
  return (
    <>
      <p className="text-sm text-muted-foreground mb-5">
        {items.length} saved {items.length === 1 ? "item" : "items"} · {AUTH_USE_MOCKS ? "Saved in this browser for the demo." : "Saved to your account."} Prices may change; open the listing for current details.
      </p>
      {storageError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Browser storage is unavailable. Your changes are kept for this visit
          only.
        </p>
      )}
      {items.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((item) => (
            <article
              key={wishlistKey(item)}
              className="relative rounded-2xl border border-border overflow-hidden bg-background"
            >
              <Link
                href={`/${item.source === "shop" ? "shop" : "products"}/${encodeURIComponent(item.id)}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="w-full aspect-square object-contain bg-muted/30 p-5"
                />
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.source === "shop" ? "Fotizo Shop" : "Marketplace"}
                  </p>
                  <h2 className="font-semibold line-clamp-2">{item.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.seller}
                  </p>
                  <Price amount={item.price} className="block font-bold mt-3" />
                </div>
              </Link>
              <WishlistButton item={item} className="absolute top-3 right-3" />
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border text-center px-5 py-14">
          <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Your wishlist is empty</h2>
          <p className="text-muted-foreground text-sm mt-2 mb-5">
            Tap the heart on an item to save it for later.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/shop">Browse shop</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/products">Browse marketplace</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
