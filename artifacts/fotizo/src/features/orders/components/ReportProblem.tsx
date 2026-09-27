import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/api";
import {
  DISPUTE_CATEGORIES,
  DISPUTE_STATUS_LABELS,
  disputesService,
  type DisputeCategory,
} from "../services/disputes.service";

/** Lets a buyer report a problem with an order and follow its progress. */
export function ReportProblem({ orderId }: { orderId: string }) {
  const cache = useQueryClient();
  const key = ["order-disputes", orderId];
  const disputes = useQuery({ queryKey: key, queryFn: () => disputesService.list(orderId) });
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<DisputeCategory | "">("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const report = useMutation({
    mutationFn: () => disputesService.open(orderId, { category: category as DisputeCategory, summary: summary.trim() }),
    onSuccess: async () => {
      setOpen(false);
      setSummary("");
      setCategory("");
      await cache.invalidateQueries({ queryKey: key });
    },
    onError: (failure) => setError(apiErrorMessage(failure, "We couldn't send your report. Please try again.")),
  });
  const active = disputes.data?.find((d) => d.status !== "resolved");
  const latest = active ?? disputes.data?.[0];

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!category) return setError("Choose what went wrong.");
    if (summary.trim().length < 10) return setError("Describe the problem in at least 10 characters.");
    report.mutate();
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold">Problem with this order?</h3>
      {latest && (
        <p role="status" className="mt-1 text-sm text-muted-foreground">
          {latest.categoryLabel} · {latest.reference} · {DISPUTE_STATUS_LABELS[latest.status]}
        </p>
      )}
      {disputes.isError && (
        <p className="mt-1 text-sm text-muted-foreground">We couldn't load earlier reports for this order.</p>
      )}
      {!disputes.isLoading && !active && !open && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
          Report a problem
        </Button>
      )}
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <label className="block text-sm font-medium" htmlFor={`problem-${orderId}`}>
            What went wrong?
          </label>
          <select
            id={`problem-${orderId}`}
            value={category}
            onChange={(e) => setCategory(e.target.value as DisputeCategory)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select an option</option>
            {DISPUTE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="block text-sm font-medium" htmlFor={`problem-summary-${orderId}`}>
            Describe the problem
          </label>
          <Textarea
            id={`problem-summary-${orderId}`}
            rows={4}
            maxLength={2000}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What happened, and what would you like us to do?"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Our team reviews every report with the seller. Reporting a problem doesn't issue a refund by itself.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={report.isPending}>
              {report.isPending ? "Sending…" : "Send report"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
