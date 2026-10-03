import { useEffect, useLayoutEffect, useRef } from "react";

// Going back to an infinite feed returns to the item you left from, as on X,
// instead of the top. Positions are kept per URL for this tab only; a fresh
// visit (a link click rather than Back) starts at the top as usual.
let lastPopAt = -Infinity;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastPopAt = performance.now();
  });
}

const cameBackJustNow = () =>
  typeof performance !== "undefined" && performance.now() - lastPopAt < 1500;

/**
 * Opening a new page (a link click) starts at its top, wherever the previous
 * page was scrolled; Back and Forward are left to restore their own position.
 */
export function useScrollToTopOnNavigate(pathname: string) {
  useLayoutEffect(() => {
    if (!cameBackJustNow()) window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
}

const storageKey = (href: string) => `feed-scroll:${href}`;

function read(href: string): number | null {
  try {
    const value = Number(sessionStorage.getItem(storageKey(href)));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** `ready` once the cached feed has rendered, so there is height to scroll into. */
export function useFeedScrollRestore(ready: boolean) {
  const href = useRef(typeof window === "undefined" ? "" : window.location.href);
  const cameBack = useRef(cameBackJustNow());

  useLayoutEffect(() => {
    if (!ready || !cameBack.current) return;
    cameBack.current = false;
    const y = read(href.current);
    if (y !== null) window.scrollTo({ top: y, behavior: "instant" });
  }, [ready]);

  useEffect(() => {
    const key = storageKey(href.current);
    const save = () => {
      try {
        sessionStorage.setItem(key, String(Math.round(window.scrollY)));
      } catch {
        // Storage unavailable (private mode): Back simply starts at the top.
      }
    };
    // Recorded on every scroll (cheaply, once per frame) because by the time
    // the page unmounts the next route may already have reset the scroll.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (window.location.href === href.current) save();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
}
