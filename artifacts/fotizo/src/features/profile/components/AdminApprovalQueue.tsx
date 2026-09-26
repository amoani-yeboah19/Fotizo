import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { ADMIN_USE_MOCKS, ApiError } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  approvalsService,
  type ListingSubmission,
  type ApprovalStatus,
} from "../services/approvals.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Loading } from "@/components/common/QueryStates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const tone = (status: ApprovalStatus) =>
  status === "approved"
    ? "success"
    : status === "rejected"
      ? "danger"
      : "warning";
const money = (item: ListingSubmission) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: item.currency,
  }).format(item.price);
function ListingImage({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="rounded-xl border p-6 text-sm text-muted-foreground">
      Image unavailable
    </div>
  ) : (
    <img
      src={src}
      alt={title}
      onError={() => setFailed(true)}
      className="h-48 w-full rounded-xl border border-border bg-muted/30 object-contain p-3"
    />
  );
}
export function AdminApprovalQueue() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [status, setStatus] = useState<ApprovalStatus>("pending");
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ListingSubmission | null>(null);
  const [outcome, setOutcome] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const filters = { status, kind, search, page };
  const query = useQuery({
    queryKey: ["admin", user?.id, "approvals", filters],
    queryFn: () => approvalsService.list(filters),
  });
  const decision = useMutation({
    mutationFn: approvalsService.decide,
    onSuccess: async (_, input) => {
      setSelected(null);
      setOutcome(null);
      setReason("");
      setConfirmed(false);
      setNotice(
        `Submission ${input.outcome}. You can find it in the ${input.outcome} tab.`,
      );
      await cache.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const open = (item: ListingSubmission) => {
    setSelected(item);
    setOutcome(null);
    setReason("");
    setConfirmed(false);
    decision.reset();
    setNotice("");
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-5">
        Review submitted listing versions. Approval records a review outcome;
        publication is managed separately.
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          aria-label="Search submissions"
          placeholder="Search listing, seller or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <select
          aria-label="Filter submission type"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All listing types</option>
          <option value="product">Products</option>
          <option value="service">Services</option>
        </select>
      </div>
      <div
        className="flex flex-wrap gap-2 mb-5"
        aria-label="Approval status filters"
      >
        {(["pending", "approved", "rejected"] as const).map((tab) => (
          <Button
            key={tab}
            variant={status === tab ? "default" : "outline"}
            aria-pressed={status === tab}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
            className="capitalize"
          >
            {tab}
            {query.data && (
              <span className="ml-2 rounded-full bg-background/20 px-2 text-xs">
                {query.data.counts[tab]}
              </span>
            )}
          </Button>
        ))}
      </div>
      {notice && (
        <p role="status" className="mb-4 text-sm text-primary">
          {notice}
        </p>
      )}
      {query.isPending ? (
        <Loading label="Loading submissions…" />
      ) : query.isError ? (
        <div role="alert" className="p-6 text-center">
          <p className="text-destructive mb-3">
            Unable to load the approval queue.
          </p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y divide-border">
            {query.data.items.map((item) => (
              <article
                key={item.id}
                className="p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.title}</h2>
                    <StatusBadge tone={tone(item.status)}>
                      {item.status}
                    </StatusBadge>
                    {item.version > 1 && (
                      <StatusBadge tone="warning">
                        Resubmitted · v{item.version}
                      </StatusBadge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground capitalize">
                    {item.seller.name} · {item.kind} · {money(item)}
                    {item.kind === "service" ? " / hour" : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted {new Date(item.submittedAt).toLocaleString()}
                  </p>
                </div>
                <Button variant="outline" onClick={() => open(item)}>
                  {item.status === "pending"
                    ? "Review submission"
                    : "View decision"}
                </Button>
              </article>
            ))}
          </div>
          {!query.data.items.length && (
            <div className="p-12 text-center">
              <h2 className="font-semibold">No {status} submissions</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {search || kind
                  ? "Try a different search or listing type."
                  : "Submissions will appear here when they reach this stage."}
              </p>
            </div>
          )}
          <div className="border-t border-border p-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {query.data.total} submissions · Page {page} of{" "}
              {Math.max(1, Math.ceil(query.data.total / 20))}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= query.data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </SurfaceCard>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !decision.isPending) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title ?? "Listing review"}</DialogTitle>
            <DialogDescription>
              Review the submitted details, seller and version history before
              deciding.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={tone(selected.status)}>
                  {selected.status}
                </StatusBadge>
                <span className="text-xs text-muted-foreground">
                  Version {selected.version} · {selected.kind}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {selected.images.length ? (
                  selected.images.map((src, i) => (
                    <ListingImage
                      key={src + i}
                      src={src}
                      title={`${selected.title} — image ${i + 1}`}
                    />
                  ))
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                    No images submitted
                  </div>
                )}
              </div>
              <section>
                <h3 className="font-semibold mb-2">Listing details</h3>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {selected.description}
                </p>
                <p className="text-sm mt-3">
                  {selected.category} ·{" "}
                  <strong>
                    {money(selected)}
                    {selected.kind === "service" ? " per hour" : ""}
                  </strong>
                </p>
              </section>
              <section className="rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-2">Seller information</h3>
                <p className="text-sm">{selected.seller.name}</p>
                <p className="text-sm text-muted-foreground mb-2">
                  {selected.seller.email}
                </p>
                <StatusBadge
                  tone={selected.seller.verified ? "success" : "warning"}
                >
                  {selected.seller.verified
                    ? "Verified account"
                    : "Unverified account"}
                </StatusBadge>
              </section>
              <section>
                <h3 className="font-semibold mb-3">
                  Submission & decision history
                </h3>
                <ol className="space-y-3">
                  {selected.history.map((event) => (
                    <li
                      key={event.id}
                      className="border-l-2 border-border pl-4"
                    >
                      <p className="text-sm font-medium capitalize">
                        {event.action} · Version {event.version}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.actor} ·{" "}
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                      <p className="text-sm mt-2 whitespace-pre-wrap break-words">
                        {event.reason}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
              {selected.status === "pending" ? (
                <form
                  className="border-t border-border pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (outcome && confirmed)
                      decision.mutate({
                        id: selected.id,
                        expectedVersion: selected.version,
                        outcome,
                        reason: reason.trim(),
                      });
                  }}
                >
                  <fieldset disabled={decision.isPending}>
                    <legend className="font-semibold mb-3">
                      Review decision
                    </legend>
                    <div className="flex gap-2 mb-4">
                      <Button
                        type="button"
                        variant={outcome === "approved" ? "default" : "outline"}
                        aria-pressed={outcome === "approved"}
                        onClick={() => {
                          setOutcome("approved");
                          setConfirmed(false);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant={
                          outcome === "rejected" ? "destructive" : "outline"
                        }
                        aria-pressed={outcome === "rejected"}
                        onClick={() => {
                          setOutcome("rejected");
                          setConfirmed(false);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                    <label
                      htmlFor="approval-reason"
                      className="block text-sm font-medium mb-2"
                    >
                      {outcome === "rejected"
                        ? "Explain what the seller must correct"
                        : "Reason for this decision"}
                    </label>
                    <textarea
                      id="approval-reason"
                      required
                      minLength={5}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
                    />
                    <label className="flex gap-3 items-start text-sm mt-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      <span>
                        I reviewed version {selected.version} and confirm this
                        decision.
                      </span>
                    </label>
                  </fieldset>
                  {decision.isError && (
                    <p role="alert" className="text-sm text-destructive mt-3">
                      {decision.error instanceof ApiError
                        ? String(
                            (decision.error.data as { error?: string })
                              ?.error ??
                              "Unable to save. Refresh and try again.",
                          )
                        : decision.error.message}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={decision.isPending}
                      onClick={() => setSelected(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant={
                        outcome === "rejected" ? "destructive" : "default"
                      }
                      disabled={
                        !outcome ||
                        !confirmed ||
                        reason.trim().length < 5 ||
                        decision.isPending
                      }
                    >
                      {decision.isPending
                        ? "Saving…"
                        : ADMIN_USE_MOCKS
                          ? "Save demo decision"
                          : "Save decision"}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  {selected.status === "rejected"
                    ? "Awaiting seller corrections and resubmission. A revised submission returns to Pending with a new version and keeps this history."
                    : "This version has been approved. Publication is controlled separately."}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
