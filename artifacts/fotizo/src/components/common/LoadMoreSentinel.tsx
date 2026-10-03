import { useEffect, useRef } from "react";
import { Loading } from "@/components/common/QueryStates";

// Invisible marker under a paged grid: when it scrolls near the viewport the
// next server page loads, so long catalogues keep the single-grid design
// without fetching everything up front. Pages are requested well before the
// end is reached so scrolling feels continuous, as on a social feed.
export function LoadMoreSentinel({
  hasMore,
  loading,
  onLoadMore,
  error = false,
  endLabel,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** The last page failed: stop loading automatically and offer a retry. */
  error?: boolean;
  /** Shown once every page has loaded. */
  endLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Callers pass a fresh arrow each render; keep the observer stable.
  const load = useRef(onLoadMore);
  load.current = onLoadMore;
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || loading || error || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) load.current();
      },
      { rootMargin: "1500px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, error]);
  return (
    <>
      <div ref={ref} aria-hidden="true" className="h-px" />
      {loading ? (
        <Loading label="Loading more…" className="py-8" />
      ) : error && hasMore ? (
        <p className="py-8 text-center text-sm text-muted-foreground" role="alert">
          More items could not be loaded.{" "}
          <button className="font-medium text-foreground underline" onClick={() => load.current()}>
            Try again
          </button>
        </p>
      ) : !hasMore && endLabel ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{endLabel}</p>
      ) : null}
    </>
  );
}
