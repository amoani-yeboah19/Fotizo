import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_USE_MOCKS, ApiError } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  operationsService,
  CASE_ACTIONS,
  CASE_ACTION_LABELS,
  type DisputeDecision,
  type ManagedOrder,
} from "../services/operations.service";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Loading } from "@/components/common/QueryStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
const date = (value: string) => new Date(value).toLocaleString();
const tone = (value: string) =>
  ["delivered", "resolved", "paid"].includes(value)
    ? "success"
    : ["cancelled", "escalated"].includes(value)
      ? "danger"
      : "warning";
const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm";
function errorText(error: unknown) {
  if (
    error instanceof ApiError &&
    error.data &&
    typeof error.data === "object" &&
    "error" in error.data
  )
    return String(error.data.error);
  return error instanceof Error
    ? error.message
    : "Unable to record the decision.";
}
function Parties({ order }: { order: ManagedOrder }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 text-sm">
      <div>
        <h3 className="font-semibold">Buyer</h3>
        <p className="mt-1">{order.buyer.name}</p>
        <p className="text-muted-foreground break-all">{order.buyer.email}</p>
      </div>
      <div>
        <h3 className="font-semibold">Seller</h3>
        <p className="mt-1">{order.seller.name}</p>
        <p className="text-muted-foreground break-all">{order.seller.email}</p>
      </div>
    </div>
  );
}
export function AdminOperations() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"orders" | "disputes">("orders");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{
    orderId: string;
    caseId?: string;
  } | null>(null);
  const filters = { page, search, status };
  const orders = useQuery({
    queryKey: ["admin", user?.id, "orders", filters],
    queryFn: () => operationsService.orders(filters),
    enabled: tab === "orders",
  });
  const disputes = useQuery({
    queryKey: ["admin", user?.id, "disputes", filters],
    queryFn: () => operationsService.disputes(filters),
    enabled: tab === "disputes",
  });
  const current = tab === "orders" ? orders : disputes;
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-5">
        Follow orders, delivery exceptions and customer disputes. Refund
        requests go to review; these controls do not transfer money.
      </p>
      <div className="flex gap-2 mb-5">
        {(["orders", "disputes"] as const).map((value) => (
          <Button
            key={value}
            variant={tab === value ? "default" : "outline"}
            aria-pressed={tab === value}
            className="capitalize"
            onClick={() => {
              setTab(value);
              setStatus("");
              setPage(1);
            }}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          aria-label="Search orders and disputes"
          placeholder={
            tab === "orders"
              ? "Order reference, buyer or seller…"
              : "Dispute, order reference or customer…"
          }
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={selectClass}
          aria-label={`Filter ${tab} by status`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {(tab === "orders"
            ? ["pending", "processing", "shipped", "delivered", "cancelled"]
            : ["open", "reviewing", "escalated", "resolved"]
          ).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {current.isPending ? (
        <Loading label={`Loading ${tab}…`} />
      ) : current.isError ? (
        <div role="alert" className="p-8 text-center">
          <p className="mb-3 text-destructive">Unable to load {tab}.</p>
          <Button variant="outline" onClick={() => current.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <SurfaceCard className="overflow-hidden">
          {tab === "orders" && orders.data && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    {[
                      "Order",
                      "Buyer / seller",
                      "Total",
                      "Fulfilment",
                      "Payment",
                      "Action",
                    ].map((h) => (
                      <th key={h} className="p-4 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.data.items.map((order) => (
                    <tr key={order.id}>
                      <td className="p-4">
                        <p className="font-semibold">{order.reference}</p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap mt-1">
                          {date(order.createdAt)}
                        </p>
                        {order.delivery.exception && (
                          <p className="mt-2 text-xs text-destructive">
                            Delivery exception
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <p>{order.buyer.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Seller: {order.seller.name}
                        </p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {money(order.total, order.currency)}
                      </td>
                      <td className="p-4">
                        <StatusBadge tone={tone(order.status)}>
                          {order.status}
                        </StatusBadge>
                      </td>
                      <td className="p-4">
                        <StatusBadge tone={tone(order.payment)}>
                          {order.payment}
                        </StatusBadge>
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected({ orderId: order.id })}
                        >
                          View order
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "disputes" && disputes.data && (
            <div className="divide-y divide-border">
              {disputes.data.items.map((item) => (
                <article key={item.id} className="p-5">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <h2 className="font-semibold">
                          {item.reference} · {item.category}
                        </h2>
                        <StatusBadge tone={tone(item.status)}>
                          {item.status}
                        </StatusBadge>
                        {item.priority === "high" && (
                          <StatusBadge tone="danger">High priority</StatusBadge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {item.order.reference} · {item.order.buyer.name} ·{" "}
                        {date(item.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelected({ orderId: item.orderId, caseId: item.id })
                      }
                    >
                      Review dispute
                    </Button>
                  </div>
                  <p className="text-sm mt-3">{item.summary}</p>
                </article>
              ))}
            </div>
          )}
          {current.data?.total === 0 && (
            <p className="p-12 text-center text-muted-foreground">
              No {tab} match these filters.
            </p>
          )}
          {current.data && (
            <div className="border-t border-border p-4 flex justify-between items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {current.data.total} records · Page {page} of{" "}
                {Math.max(
                  1,
                  Math.ceil(current.data.total / current.data.pageSize),
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * current.data.pageSize >= current.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </SurfaceCard>
      )}
      {selected && (
        <OrderReview
          key={`${selected.orderId}-${selected.caseId ?? "order"}`}
          orderId={selected.orderId}
          initialCaseId={selected.caseId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
function OrderReview({
  orderId,
  initialCaseId,
  onClose,
}: {
  orderId: string;
  initialCaseId?: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [activeCaseId, setActiveCaseId] = useState(initialCaseId ?? "");
  const [pending, setPending] = useState<Omit<
    DisputeDecision,
    "reason"
  > | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["admin", user?.id, "order-detail", orderId],
    queryFn: () => operationsService.order(orderId),
  });
  const mutation = useMutation({
    mutationFn: operationsService.decide,
    onSuccess: async (_, input) => {
      setPending(null);
      setReason("");
      setConfirmed(false);
      setNotice(
        input.action === "escalate_refund"
          ? "Refund review requested. No refund has been issued."
          : "Dispute updated and added to the audit trail.",
      );
      await cache.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const order = query.data?.order;
  const currentCase =
    query.data?.disputes.find((d) => d.id === activeCaseId) ??
    query.data?.disputes[0];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialCaseId ? "Dispute review" : "Order details"}
            {order ? ` · ${order.reference}` : ""}
          </DialogTitle>
          <DialogDescription>
            Order, delivery and payment records with linked customer cases.
          </DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <Loading label="Loading order details…" />
        ) : query.isError ? (
          <div role="alert">
            <p className="text-destructive mb-3">Unable to load this order.</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          order &&
          query.data && (
            <>
              {ADMIN_USE_MOCKS && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Sample records only. Decisions reset on reload and do not
                  update real orders, notify customers or issue refunds.
                </p>
              )}
              {notice && (
                <p role="status" className="text-sm text-primary">
                  {notice}
                </p>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge tone={tone(order.status)}>
                  {order.status}
                </StatusBadge>
                <StatusBadge tone={tone(order.payment)}>
                  Payment: {order.payment}
                </StatusBadge>
                <span className="text-xs text-muted-foreground">
                  Placed {date(order.createdAt)}
                </span>
              </div>
              <Parties order={order} />
              <section className="border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3">Items & total</h3>
                <ul className="space-y-2 text-sm">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {item.title} × {item.quantity}
                        <span className="text-muted-foreground">
                          {" "}
                          · {money(item.unitPrice, order.currency)} each
                        </span>
                      </span>
                      <span className="whitespace-nowrap">
                        {money(item.quantity * item.unitPrice, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm mt-3 flex justify-between">
                  <span>Delivery</span>
                  <span>{money(order.deliveryFee, order.currency)}</span>
                </p>
                <p className="font-semibold border-t border-border mt-3 pt-3 flex justify-between">
                  <span>Order total</span>
                  <span>{money(order.total, order.currency)}</span>
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Delivery</h3>
                <p className="text-sm">{order.delivery.destination}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {order.delivery.carrier ?? "Courier not assigned"} ·{" "}
                  {order.delivery.tracking ?? "Tracking not available"}
                </p>
                {order.delivery.exception && (
                  <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {order.delivery.exception}
                  </p>
                )}
              </section>
              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer font-semibold">
                  Order timeline
                </summary>
                <ol className="mt-3 space-y-3">
                  {order.timeline.map((event) => (
                    <li key={event.id}>
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {date(event.createdAt)}
                      </p>
                      <p className="text-sm mt-1">{event.detail}</p>
                    </li>
                  ))}
                </ol>
              </details>
              <section className="border-t border-border pt-4">
                <h3 className="font-semibold mb-3">
                  Linked disputes ({query.data.disputes.length})
                </h3>
                {!currentCase ? (
                  <p className="text-sm text-muted-foreground">
                    No disputes are linked to this order.
                  </p>
                ) : (
                  <>
                    {query.data.disputes.length > 1 && (
                      <select
                        aria-label="Select linked dispute"
                        className={`${selectClass} mb-3`}
                        value={currentCase.id}
                        disabled={!!pending}
                        onChange={(e) => setActiveCaseId(e.target.value)}
                      >
                        {query.data.disputes.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.reference} · {d.category}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium">
                        {currentCase.reference} · {currentCase.category}
                      </h4>
                      <StatusBadge tone={tone(currentCase.status)}>
                        {currentCase.status}
                      </StatusBadge>
                    </div>
                    <p className="text-sm mt-2 mb-4">{currentCase.summary}</p>
                    <h4 className="text-sm font-semibold mb-2">
                      Submitted statements
                    </h4>
                    <div className="space-y-2">
                      {currentCase.evidence.map((e, i) => (
                        <blockquote
                          key={i}
                          className="rounded-lg bg-muted/50 p-3"
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {e.statement}
                          </p>
                          <footer className="mt-2 text-xs text-muted-foreground">
                            {e.submittedBy} · {date(e.createdAt)}
                          </footer>
                        </blockquote>
                      ))}
                    </div>
                    {currentCase.history.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">
                          Decision history
                        </h4>
                        <ol className="space-y-3">
                          {currentCase.history.map((event) => (
                            <li
                              key={event.id}
                              className="border-l-2 border-border pl-3"
                            >
                              <p className="text-sm font-medium">
                                {event.action}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.actor} · {date(event.createdAt)}
                              </p>
                              <p className="text-sm whitespace-pre-wrap break-words mt-1">
                                {event.reason}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {currentCase.status === "escalated" && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Awaiting finance review. No refund is approved or issued
                        by this action.
                      </p>
                    )}
                    {pending ? (
                      <form
                        className="mt-5 rounded-xl border border-border p-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (confirmed)
                            mutation.mutate({
                              ...pending,
                              reason: reason.trim(),
                            });
                        }}
                      >
                        <h4 className="font-semibold mb-2">
                          {CASE_ACTION_LABELS[pending.action]}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {pending.action === "escalate_refund"
                            ? "Record why finance should review a possible refund. Payment status will stay unchanged."
                            : pending.action === "resolve"
                              ? "Close this dispute without issuing a refund. Explain the agreed resolution."
                              : "Record why the dispute needs further review."}
                        </p>
                        <label
                          className="block text-sm font-medium mb-2"
                          htmlFor="dispute-reason"
                        >
                          Decision reason
                        </label>
                        <textarea
                          id="dispute-reason"
                          required
                          minLength={5}
                          maxLength={1000}
                          disabled={mutation.isPending}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
                        />
                        <label className="mt-3 flex items-start gap-3 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={confirmed}
                            disabled={mutation.isPending}
                            onChange={(e) => setConfirmed(e.target.checked)}
                          />
                          <span>
                            I reviewed the order and case statements and confirm
                            this action.
                          </span>
                        </label>
                        {mutation.isError && (
                          <p
                            role="alert"
                            className="mt-3 text-sm text-destructive"
                          >
                            {errorText(mutation.error)}
                          </p>
                        )}
                        <div className="mt-4 flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={mutation.isPending}
                            onClick={() => setPending(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              mutation.isPending ||
                              !confirmed ||
                              reason.trim().length < 5
                            }
                          >
                            {mutation.isPending
                              ? "Saving…"
                              : ADMIN_USE_MOCKS
                                ? "Save demo decision"
                                : "Save decision"}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {CASE_ACTIONS[currentCase.status].map((action) => (
                          <Button
                            key={action}
                            variant="outline"
                            onClick={() => {
                              setPending({
                                id: currentCase.id,
                                expectedVersion: currentCase.version,
                                action,
                              });
                              setReason("");
                              setConfirmed(false);
                              setNotice("");
                              mutation.reset();
                            }}
                          >
                            {CASE_ACTION_LABELS[action]}
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
