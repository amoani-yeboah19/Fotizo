import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

export interface WishlistItem {
  id: string;
  source: "marketplace" | "shop";
  title: string;
  image: string;
  price: number;
  seller: string;
}
export const wishlistKey = (item: Pick<WishlistItem, "id" | "source">) =>
  `${item.source}:${item.id}`;
export function parseWishlist(raw: string | null): WishlistItem[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (i): i is WishlistItem =>
        !!i &&
        typeof i === "object" &&
        typeof i.id === "string" &&
        ["marketplace", "shop"].includes(i.source) &&
        typeof i.title === "string" &&
        typeof i.image === "string" &&
        typeof i.seller === "string" &&
        typeof i.price === "number" &&
        Number.isFinite(i.price) &&
        i.price >= 0,
    );
    return [...new Map(valid.map((i) => [wishlistKey(i), i])).values()];
  } catch {
    return [];
  }
}
interface WishlistContextValue {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  remove: (item: WishlistItem) => void;
  has: (item: Pick<WishlistItem, "id" | "source">) => boolean;
  storageError: boolean;
}
const WishlistContext = createContext<WishlistContextValue | null>(null);
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = `fotizo:wishlist:v1:${user?.id ?? "guest"}`;
  return (
    <WishlistStore key={storageKey} storageKey={storageKey}>
      {children}
    </WishlistStore>
  );
}
function WishlistStore({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    try {
      return parseWishlist(localStorage.getItem(storageKey));
    } catch {
      return [];
    }
  });
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        setItems(parseWishlist(event.newValue));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);
  const update = (next: WishlistItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  const has = (item: Pick<WishlistItem, "id" | "source">) =>
    items.some((i) => wishlistKey(i) === wishlistKey(item));
  return (
    <WishlistContext.Provider
      value={{
        items,
        has,
        storageError,
        toggle: (item) =>
          update(
            has(item)
              ? items.filter((i) => wishlistKey(i) !== wishlistKey(item))
              : [item, ...items],
          ),
        remove: (item) =>
          update(items.filter((i) => wishlistKey(i) !== wishlistKey(item))),
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error("useWishlist requires WishlistProvider");
  return value;
}

export function useOptionalWishlist() { return useContext(WishlistContext); }
