import { AUTH_USE_MOCKS } from "@/api";
import { useOptionalWishlist } from "@/contexts/WishlistContext";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";
import { wishlistService } from "../services/wishlist.service";

const wishlistKey = (userId: string | undefined) => ["wishlist", userId] as const;

/** The fields a product card shows; enough for an optimistic wishlist entry. */
export type WishlistProduct = Pick<
  Product,
  "id" | "title" | "price" | "originalPrice" | "rating" | "reviewCount" | "seller" | "category" | "image"
> & { channel?: "marketplace" | "shop" };

/** The signed-in account's saved products (empty when signed out). */
export function useWishlist() {
  const local = useOptionalWishlist();
  const demo = AUTH_USE_MOCKS && !!local;
  const { user, isAuthenticated } = useAuth();
  const query = useQuery<WishlistProduct[]>({
    queryKey: wishlistKey(user?.id),
    queryFn: wishlistService.list,
    enabled: isAuthenticated && !demo,
  });
  if (demo) return { ...query, data: local.items.map(i => ({ ...i, channel: i.source, originalPrice: null, rating: 0, reviewCount: 0, category: "" })), isPending: false, isLoading: false, isError: false };
  return query;
}

/**
 * Heart-button behaviour: saves or removes a product, updating every heart at
 * once and rolling back if the server refuses. Signed-out visitors are asked
 * to sign in and brought back to the same page.
 */
export function useWishlistToggle() {
  const local = useOptionalWishlist();
  const { user, isAuthenticated } = useAuth();
  const openAuth = useAuthModal();
  const [location] = useLocation();
  const cache = useQueryClient();
  const { toast } = useToast();
  const { data } = useWishlist();
  const saved = useMemo(() => new Set((data ?? []).map((p) => p.id)), [data]);
  const key = wishlistKey(user?.id);

  const mutation = useMutation({
    mutationFn: ({ product, save }: { product: WishlistProduct; save: boolean }) =>
      save ? wishlistService.add(product.id) : wishlistService.remove(product.id),
    onMutate: async ({ product, save }) => {
      await cache.cancelQueries({ queryKey: key });
      const previous = cache.getQueryData<WishlistProduct[]>(key);
      cache.setQueryData<WishlistProduct[]>(key, (list = []) => {
        const rest = list.filter((p) => p.id !== product.id);
        return save ? [product, ...rest] : rest;
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      cache.setQueryData(key, context?.previous);
      toast({
        variant: "destructive",
        title: "Wishlist not updated",
        description: apiErrorMessage(error, "Please try again."),
      });
    },
    onSettled: () => cache.invalidateQueries({ queryKey: key }),
  });

  return {
    isSaved: (productId: string) => saved.has(productId),
    toggle: (product: WishlistProduct) => {
      if (AUTH_USE_MOCKS && local) {
        local.toggle({ id: product.id, source: product.channel ?? "marketplace", title: product.title, image: product.image, price: product.price, seller: product.seller });
        return;
      }
      if (!isAuthenticated) {
        openAuth("signin", location);
        return;
      }
      mutation.mutate({ product, save: !saved.has(product.id) });
    },
  };
}
