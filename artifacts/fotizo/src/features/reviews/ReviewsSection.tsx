import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { apiErrorMessage, CATALOG_USE_MOCKS } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { reviewsService, type ReviewKind } from "./reviews.service";

const Stars = ({ value, className }: { value: number; className?: string }) => (
  <span className="inline-flex" aria-label={`${value} out of 5 stars`} role="img">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        aria-hidden="true"
        className={cn("h-4 w-4", n <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/40", className)}
      />
    ))}
  </span>
);

/** Star picker for writing a review. */
function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Star className={cn("h-7 w-7", n <= value ? "fill-accent text-accent" : "text-muted-foreground/40")} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/**
 * A product's or service's reviews, and — for customers with a delivered
 * order or completed booking — a form to write, change or remove their own.
 */
export function ReviewsSection({ kind, listingId }: { kind: ReviewKind; listingId: string }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const live = !CATALOG_USE_MOCKS;
  const list = useQuery({
    queryKey: ["reviews", kind, listingId],
    queryFn: () => reviewsService.list(kind, listingId),
    enabled: live,
  });
  const mine = useQuery({
    queryKey: ["reviews", kind, listingId, "mine"],
    queryFn: () => reviewsService.mine(kind, listingId),
    enabled: live && isAuthenticated,
  });
  // Arriving from a "Write a review" link: bring the reviews into view once loaded.
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (list.isSuccess && window.location.hash === "#reviews") sectionRef.current?.scrollIntoView({ block: "start" });
  }, [list.isSuccess]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const own = mine.data?.review;
    setRating(own?.rating ?? 0);
    setComment(own?.comment ?? "");
  }, [mine.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["reviews", kind, listingId] });
    // The listing's average and count change with each review.
    void queryClient.invalidateQueries({ queryKey: [kind === "product" ? "product" : "service"] });
    void queryClient.invalidateQueries({ queryKey: ["shop"] });
  };
  const save = useMutation({
    mutationFn: () => reviewsService.save({ kind, listingId, rating, comment }),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => reviewsService.remove(mine.data!.review!.id),
    onSuccess: refresh,
  });

  if (!live) return <p className="text-muted-foreground">Reviews appear here once customers have bought this.</p>;

  const data = list.data;
  const own = mine.data?.review;
  const showForm = mine.data?.canReview && (!own || editing);
  const noun = kind === "product" ? "product" : "service";

  return (
    <section ref={sectionRef} aria-labelledby={`${kind}-reviews-heading`} className="space-y-6 scroll-mt-24">
      <h2 id={`${kind}-reviews-heading`} className="text-xl font-bold">
        Customer reviews
      </h2>

      {list.isLoading ? (
        <p className="text-muted-foreground">Loading reviews…</p>
      ) : list.isError ? (
        <p className="text-muted-foreground" role="alert">
          Reviews couldn't be loaded.{" "}
          <button type="button" className="underline" onClick={() => void list.refetch()}>
            Try again
          </button>
        </p>
      ) : data && data.total > 0 && data.average != null ? (
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            <p className="text-4xl font-bold">{data.average.toFixed(1)}</p>
            <Stars value={data.average} />
            <p className="mt-1 text-sm text-muted-foreground">
              {data.total} review{data.total === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="flex-1 space-y-1 text-sm" aria-label="Ratings breakdown">
            {[5, 4, 3, 2, 1].map((stars) => {
              const n = data.breakdown[stars - 1];
              return (
                <li key={stars} className="flex items-center gap-2">
                  <span className="w-12 text-muted-foreground">{stars} star</span>
                  <span className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <span className="block h-full bg-accent" style={{ width: `${(n / data.total) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right text-muted-foreground">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-muted-foreground">No reviews yet.</p>
      )}

      {own && !editing && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">Your review</p>
          <Stars value={own.rating} className="mt-1" />
          {own.comment && <p className="mt-2 whitespace-pre-line">{own.comment}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate()}>
              {remove.isPending ? "Removing…" : "Delete"}
            </Button>
          </div>
          {remove.isError && (
            <p className="mt-2 text-destructive" role="alert">
              {apiErrorMessage(remove.error, "Your review couldn't be removed. Please try again.")}
            </p>
          )}
        </div>
      )}

      {showForm && (
        <form
          className="rounded-xl border border-border p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (rating) save.mutate();
          }}
        >
          <p className="font-semibold">{own ? "Edit your review" : `Review this ${noun}`}</p>
          <StarInput value={rating} onChange={setRating} />
          <Textarea
            aria-label="Your review (optional)"
            placeholder={`What did you think of this ${noun}? (optional)`}
            maxLength={2000}
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {save.isError && (
            <p className="text-sm text-destructive" role="alert">
              {apiErrorMessage(save.error, "Your review couldn't be saved. Please try again.")}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!rating || save.isPending}>
              {save.isPending ? "Saving…" : own ? "Save changes" : "Post review"}
            </Button>
            {own && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      {isAuthenticated && mine.data && !mine.data.canReview && (
        <p className="text-sm text-muted-foreground">
          {kind === "product"
            ? "You can review this product once an order of it has been delivered to you."
            : "You can review this service once a booking of it is completed."}
        </p>
      )}

      {data && data.items.length > 0 && (
        <ul className="divide-y divide-border">
          {data.items.map((r) => (
            <li key={r.id} className="py-4">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} />
                <span className="text-sm font-medium">{r.author}</span>
                <span className="text-xs text-muted-foreground">{date(r.createdAt)}</span>
              </div>
              {r.comment && <p className="mt-2 text-sm whitespace-pre-line">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
