import { useEffect, useRef } from "react";
import { Loading } from "@/components/common/QueryStates";

// Invisible marker under a paged grid: when it scrolls near the viewport the
// next server page loads, so long catalogues keep the single-grid design
// without fetching everything up front.
export function LoadMoreSentinel({
  hasMore,
  loading,
  onLoadMore,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || loading || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);
  return (
    <>
      <div ref={ref} aria-hidden="true" className="h-px" />
      {loading && <Loading label="Loading more…" className="py-8" />}
    </>
  );
}
