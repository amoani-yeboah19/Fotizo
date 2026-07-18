import { useEffect } from "react";

// Keeps a global `--app-height` CSS variable in sync with the *visible* viewport
// height. Unlike 100vh / 100dvh, this shrinks when the on-screen keyboard opens
// (via the VisualViewport API), so fixed-height chat layouts keep their input
// above the keyboard on every platform — iOS Safari, Android Chrome, and
// installed PWAs / web-app mode. Layouts read it as
// `calc(var(--app-height, 100dvh) - <offset>)`.
export function useVisibleViewportHeight() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--app-height", `${Math.round(h)}px`);
    };
    apply();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      root.style.removeProperty("--app-height");
    };
  }, []);
}
