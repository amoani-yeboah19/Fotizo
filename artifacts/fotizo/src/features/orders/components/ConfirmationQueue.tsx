import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmationActions, useConfirmationQueue } from "@/features/payments/hooks";
import { apiErrorMessage } from "@/api";
import type { ConfirmationRequest } from "@/types";

// Fotizo's queue of orders with imported goods. For each one, check the
// buyer's options, the supplier's price and minimum order and the delivery,
// then send the confirmed quote (GBP, including Fotizo's margin) or decline.
export function ConfirmationQueue({ showHeading = true }: { showHeading?: boolean }) {
  const { data, isLoading, isError } = useConfirmationQueue();
  if (isLoading) return <Loading label="Loading orders to confirm…" />;
  if (isError) return <ErrorState label="Orders to confirm could not be loaded." />;
  return (
    <div className="space-y-6">
      <div>
        {showHeading && <h2 className="text-lg font-bold">Order confirmations</h2>}
        <p className="text-sm text-muted-foreground">
          Imported items are confirmed with the supplier before the buyer pays. The buyer has{" "}
          7 days to accept a quote.
        </p>
      </div>
      {data!.length === 0 ? (
        <SurfaceCard className="p-6 text-sm text-muted-foreground">No orders are waiting for confirmation.</SurfaceCard>
      ) : (
        data!.map((request) => <ConfirmationCard key={request.orderId} request={request} />)
      )}
    </div>
  );
}

const money = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

function ConfirmationCard({ request }: { request: ConfirmationRequest }) {
  const { quote, decline } = useConfirmationActions();
  const imported = request.items.filter((i) => i.needsConfirmation && i.status !== "cancelled");
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(imported.map((i) => [i.id, money(i.price)])),
  );
  const [optionsById, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(imported.map((i) => [i.id, i.confirmedOptions ?? i.requestedOptions ?? ""])),
  );
  const [shipping, setShipping] = useState(money(request.shipping));
  const [daysMin, setDaysMin] = useState(String(request.deliveryDaysMin ?? ""));
  const [daysMax, setDaysMax] = useState(String(request.deliveryDaysMax ?? ""));
  const [note, setNote] = useState(request.confirmationStatus === "quoted" ? request.confirmationNote ?? "" : "");
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const lineTotal = (i: ConfirmationRequest["items"][number]) =>
    (i.needsConfirmation ? Number(prices[i.id]) || 0 : i.price) * i.quantity;
  const subtotal = request.items.filter((i) => i.status !== "cancelled").reduce((sum, i) => sum + lineTotal(i), 0);
  const total = subtotal + (Number(shipping) || 0);

  const send = async () => {
    setError("");
    const min = Number(daysMin);
    const max = Number(daysMax);
    if (imported.some((i) => !(Number(prices[i.id]) > 0)))
      return setError("Enter a confirmed price above zero for every imported item.");
    if (daysMin === "" || daysMax === "" || !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min)
      return setError("Enter the delivery time in whole days, the longest at least the shortest.");
    try {
      await quote.mutateAsync({
        orderId: request.orderId,
        quote: {
          items: imported.map((i) => ({
            id: i.id,
            price: Number(prices[i.id]),
            ...(optionsById[i.id]?.trim() ? { confirmedOptions: optionsById[i.id].trim() } : {}),
          })),
          shipping: Number(shipping) || 0,
          deliveryDaysMin: min,
          deliveryDaysMax: max,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
    } catch (e) {
      setError(apiErrorMessage(e, "The quote could not be sent. Refresh and try again."));
    }
  };

  const sendDecline = async () => {
    setError("");
    if (reason.trim().length < 3) return setError("Tell the buyer why the order can't be supplied.");
    try {
      await decline.mutateAsync({ orderId: request.orderId, reason: reason.trim() });
    } catch (e) {
      setError(apiErrorMessage(e, "The order could not be declined. Refresh and try again."));
    }
  };

  const busy = quote.isPending || decline.isPending;
  const id = (name: string, line?: string) => `confirm-${request.orderId}-${name}${line ? `-${line}` : ""}`;

  return (
    <SurfaceCard className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-semibold">{request.reference}</p>
          <p className="text-xs text-muted-foreground">
            {request.buyer.name} · {request.buyer.email} · {request.buyer.phone}
          </p>
          <p className="text-xs text-muted-foreground">
            Deliver to {[request.delivery.city, request.delivery.country].filter(Boolean).join(", ")} · Placed{" "}
            {new Date(request.createdAt).toLocaleDateString()} · Pays by {request.paymentMethod?.replaceAll("_", " ")}
          </p>
        </div>
        <StatusBadge tone={request.confirmationStatus === "quoted" ? "info" : "warning"}>
          {request.confirmationStatus === "quoted" ? "Quote sent" : "Awaiting confirmation"}
        </StatusBadge>
      </div>

      <ul className="divide-y divide-border">
        {request.items.map((item) => (
          <li key={item.id} className="py-4">
            <div className="flex gap-3">
              <img
                src={item.productImage}
                alt=""
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-lg bg-muted object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">
                  {item.quantity}x {item.productTitle}
                </p>
                {item.needsConfirmation && item.supplier ? (
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <p>
                      Supplier: {item.supplier.priceRange ?? "no price recorded"}
                      {item.supplier.minimumOrder ? ` · minimum ${item.supplier.minimumOrder}` : ""}
                      {item.supplier.sourceUrl && (
                        <>
                          {" · "}
                          <a
                            href={item.supplier.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-0.5 text-primary underline"
                          >
                            {item.supplier.platform ?? "Supplier"} listing <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        </>
                      )}
                    </p>
                    <p>
                      Estimated at checkout: £{money(item.estimatedPrice ?? item.price)} each · Requested:{" "}
                      {item.requestedOptions || "no options given"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.seller} · £{money(item.price)} each (marketplace item, price fixed)
                  </p>
                )}
              </div>
            </div>
            {item.needsConfirmation && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr]">
                <div className="space-y-1">
                  <Label htmlFor={id("price", item.id)} className="text-xs">Confirmed price each (GBP)</Label>
                  <Input
                    id={id("price", item.id)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={prices[item.id] ?? ""}
                    onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={id("options", item.id)} className="text-xs">Confirmed options</Label>
                  <Input
                    id={id("options", item.id)}
                    maxLength={300}
                    placeholder="Colour, size, model as the supplier will send it"
                    value={optionsById[item.id] ?? ""}
                    onChange={(e) => setOptions((o) => ({ ...o, [item.id]: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={id("shipping")} className="text-xs">Delivery fee (GBP)</Label>
          <Input id={id("shipping")} type="number" min="0" step="0.01" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id("min")} className="text-xs">Delivery from (days)</Label>
          <Input id={id("min")} type="number" min="0" step="1" inputMode="numeric" value={daysMin} onChange={(e) => setDaysMin(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id("max")} className="text-xs">Delivery to (days)</Label>
          <Input id={id("max")} type="number" min="0" step="1" inputMode="numeric" value={daysMax} onChange={(e) => setDaysMax(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <Label htmlFor={id("note")} className="text-xs">Note to the buyer (optional)</Label>
        <Textarea
          id={id("note")}
          maxLength={1000}
          rows={2}
          placeholder="For example, why the price changed from the estimate"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          Confirmed total <span className="font-bold">£{money(total)}</span>
          <span className="text-muted-foreground"> (estimate was £{money(request.total)})</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => setDeclining((d) => !d)}>
            Decline
          </Button>
          <Button disabled={busy} onClick={send}>
            {quote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {request.confirmationStatus === "quoted" ? "Update quote" : "Send confirmed quote"}
          </Button>
        </div>
      </div>
      {declining && (
        <div className="mt-4 space-y-2 rounded-xl bg-muted/50 p-4">
          <Label htmlFor={id("reason")} className="text-xs">Why can't this order be supplied?</Label>
          <Textarea
            id={id("reason")}
            maxLength={1000}
            rows={2}
            placeholder="For example, the supplier has discontinued this item"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="destructive" size="sm" disabled={busy} onClick={sendDecline}>
            {decline.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Decline order
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </SurfaceCard>
  );
}
