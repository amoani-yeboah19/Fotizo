import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import type { Order } from "@/types";
import { apiErrorMessage } from "@/api";
import { ordersService } from "@/features/payments/services/orders.service";
import { Button } from "@/components/ui/button";

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/**
 * Once an order line is past its delivery date and still hasn't arrived, the
 * buyer can alert the seller (or Fotizo, for Fotizo Shop items) by push and
 * email — once a day, so the alert keeps its weight.
 */
export function UrgentAlert({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [sent, setSent] = useState<{ nextAt: string; delivered: boolean } | null>(null);
  const send = useMutation({
    mutationFn: () => ordersService.sendUrgent(order.id),
    onSuccess: (result) => {
      setSent({ nextAt: result.urgentAvailableAt, delivered: result.delivered });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  // Delivered or cancelled lines, and orders from before delivery dates were tracked.
  if (!order.deliveryDue || !order.urgentAvailableAt) return null;

  const now = Date.now();
  const nextAt = sent?.nextAt ?? order.urgentAvailableAt;
  const overdue = now >= new Date(order.deliveryDue).getTime();
  const ready = !sent && now >= new Date(nextAt).getTime();
  const recipient = order.needsConfirmation ? "Fotizo" : order.seller;

  return (
    <div className={`rounded-xl p-4 text-sm ${overdue ? "border border-destructive/30 bg-destructive/5" : "bg-muted/50"}`}>
      <h3 className="flex items-center gap-2 font-semibold">
        <BellRing className="h-4 w-4" aria-hidden="true" /> Delivery
      </h3>
      {!overdue ? (
        <p className="mt-1 text-muted-foreground">
          Expected by {day(order.deliveryDue)}. If it hasn't arrived by then, you can send {recipient} an urgent alert.
        </p>
      ) : (
        <>
          <p className="mt-1 text-muted-foreground">
            This was due by {day(order.deliveryDue)}. If you haven't heard back, send {recipient} an urgent alert — they'll get a
            notification even when they're away from Fotizo.
          </p>
          {ready ? (
            <Button
              size="sm"
              variant="destructive"
              className="mt-3"
              disabled={send.isPending}
              onClick={() => send.mutate()}
            >
              {send.isPending ? "Sending…" : "Send urgent alert"}
            </Button>
          ) : (
            <p className="mt-3 font-medium" role="status">
              {sent
                ? `Urgent alert sent to ${recipient}.${sent.delivered ? "" : " They'll see it when they next sign in."} `
                : ""}
              You can send another after {when(nextAt)}.
            </p>
          )}
          {send.isError && (
            <p className="mt-2 text-destructive" role="alert">
              {apiErrorMessage(send.error, "The alert couldn't be sent. Please try again.")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
