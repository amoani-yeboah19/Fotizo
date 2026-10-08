import { useEffect, useState } from "react";
import { SHOP_CATEGORIES } from "../data/categories";
import { productCollections, type ViewedProduct } from "../data/shop-discovery";
import type { ShopProduct } from "../data/shop-product";
const KEY = "fotizo.shop.views.v1";
const ENABLED = "fotizo.shop.views.enabled";
const EVENT = "fotizo-shop-history";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const categories = new Set(SHOP_CATEGORIES.map((c) => c.id));
export function readShopHistory(): ViewedProduct[] {
  try {
    if (localStorage.getItem(ENABLED) === "false") return [];
    const rows: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(rows)) return [];
    const seen = new Set<string>();
    return rows
      .filter((r): r is ViewedProduct => {
        if (
          !r ||
          typeof r.id !== "string" ||
          r.id.length > 160 ||
          !categories.has(r.category) ||
          typeof r.at !== "number" ||
          r.at <= Date.now() - MAX_AGE ||
          r.at > Date.now() ||
          !Array.isArray(r.collections) ||
          !r.collections.every(
            (s: unknown) => typeof s === "string" && s.length < 80,
          ) ||
          seen.has(r.id)
        )
          return false;
        seen.add(r.id);
        return true;
      })
      .slice(0, 30);
  } catch {
    return [];
  }
}
function enabled() {
  try {
    return localStorage.getItem(ENABLED) !== "false";
  } catch {
    return false;
  }
}
function announce() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}
export function recordShopView(product: ShopProduct) {
  if (!enabled()) return;
  const entry = {
    id: product.id,
    category: product.category,
    collections: productCollections(product),
    at: Date.now(),
  };
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(
        [entry, ...readShopHistory().filter((p) => p.id !== entry.id)].slice(
          0,
          30,
        ),
      ),
    );
    announce();
  } catch {
    /* Storage may be disabled. Shopping still works. */
  }
}
export function clearShopHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* optional storage */
  }
  announce();
}
export function useShopHistory() {
  const [history, setHistory] = useState(readShopHistory);
  const [isEnabled, setEnabled] = useState(enabled);
  useEffect(() => {
    const sync = () => {
      setHistory(readShopHistory());
      setEnabled(enabled());
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = () => {
    try {
      localStorage.setItem(ENABLED, String(!isEnabled));
      if (isEnabled) localStorage.removeItem(KEY);
    } catch {
      /* optional storage */
    }
    announce();
  };
  return { history, isEnabled, toggle, clear: clearShopHistory };
}
