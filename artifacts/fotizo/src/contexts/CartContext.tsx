import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { AUTH_USE_MOCKS } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { cartService } from "@/services/cart.service";

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  total: number;
  /** False until this session's saved cart has been loaded. */
  isLoaded: boolean;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

const MAX_QUANTITY = 99;
const GUEST_KEY = "fotizo.cart.guest";

// A signed-out cart lives in this browser only. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded.
function readGuestCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        i &&
        typeof i.productId === "string" &&
        typeof i.title === "string" &&
        typeof i.price === "number" &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0,
    );
  } catch {
    return [];
  }
}
function writeGuestCart(items: CartItem[]) {
  try {
    if (items.length) localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    // Storage unavailable: the cart still works for this page view.
  }
}

// Signed in, the cart is saved to the account on the server so it survives
// refreshes and devices. CartProvider sits inside SessionScope, which remounts
// it whenever the account changes, so one account's cart never shows another's.
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const ready = status !== "loading" && status !== "signing-out";
  const serverBacked = Boolean(user) && !AUTH_USE_MOCKS;
  const [items, setItems] = useState<CartItem[]>(() => (user ? [] : readGuestCart()));
  const [isLoaded, setIsLoaded] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  // Server writes run one after another so quick clicks land in order.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const reloadFromServer = useCallback(() => {
    cartService
      .list()
      .then(setItems)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!serverBacked) {
      setItems(readGuestCart());
      setIsLoaded(true);
      return;
    }
    let cancelled = false;
    const guest = readGuestCart();
    const load = guest.length
      ? cartService.merge(guest.map((i) => ({ productId: i.productId, quantity: Math.min(i.quantity, MAX_QUANTITY) })))
      : cartService.list();
    load
      .then((saved) => {
        if (guest.length) writeGuestCart([]);
        if (!cancelled) setItems(saved);
      })
      .catch(() => {
        // Keep whatever is shown; the next change retries against the server.
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, serverBacked, user?.id]);

  // Signed-out carts persist in this browser.
  useEffect(() => {
    if (ready && !user) writeGuestCart(items);
  }, [items, ready, user]);

  const save = useCallback(
    (productId: string, quantity: number) => {
      if (!serverBacked) return;
      queue.current = queue.current
        .then(() =>
          quantity > 0 ? cartService.setQuantity(productId, quantity) : cartService.remove(productId),
        )
        // On failure, show what the server actually holds.
        .catch(reloadFromServer);
    },
    [serverBacked, reloadFromServer],
  );

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      const existing = itemsRef.current.find((i) => i.productId === item.productId);
      const quantity = Math.min(MAX_QUANTITY, (existing?.quantity ?? 0) + 1);
      setItems((prev) =>
        existing
          ? prev.map((i) => (i.productId === item.productId ? { ...i, quantity } : i))
          : [...prev, { ...item, quantity }],
      );
      save(item.productId, quantity);
    },
    [save],
  );

  const removeItem = useCallback(
    (productId: string) => {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      save(productId, 0);
    },
    [save],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const next = Math.min(MAX_QUANTITY, Math.max(0, Math.floor(quantity)));
      setItems((prev) =>
        next <= 0
          ? prev.filter((i) => i.productId !== productId)
          : prev.map((i) => (i.productId === productId ? { ...i, quantity: next } : i)),
      );
      save(productId, next);
    },
    [save],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (serverBacked)
      queue.current = queue.current.then(() => cartService.clear()).catch(reloadFromServer);
  }, [serverBacked, reloadFromServer]);

  const isInCart = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items],
  );

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, count, total, isLoaded, addItem, removeItem, updateQuantity, clearCart, isInCart }),
    [items, count, total, isLoaded, addItem, removeItem, updateQuantity, clearCart, isInCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
