import { AUTH_USE_MOCKS } from "@/api";
import { useWishlist as useLocalWishlist, type WishlistItem } from "@/contexts/WishlistContext";
import { useWishlist as useAccountWishlist, useWishlistToggle } from "./index";

// Live users share the server-backed query with product hearts. Demo identities
// have no backend session, so only they use the browser-local preview store.
export function useWishlistView() {
  const local = useLocalWishlist();
  const query = useAccountWishlist();
  const toggle = useWishlistToggle();
  if (AUTH_USE_MOCKS) return { ...local, isLoading: false, isError: false, retry: () => {} };
  const items: WishlistItem[] = (query.data ?? []).map(p => ({ id: p.id, source: p.channel ?? "marketplace", title: p.title, image: p.image, price: p.price, seller: p.seller }));
  return { items, storageError: false, has: (item: Pick<WishlistItem, "id" | "source">) => toggle.isSaved(item.id),
    toggle: (item: WishlistItem) => toggle.toggle({ ...item, channel: item.source, category: "", originalPrice: null, rating: 0, reviewCount: 0 }),
    isLoading: query.isLoading, isError: query.isError, retry: () => { void query.refetch(); },
  };
}
