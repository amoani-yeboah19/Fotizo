import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/api";
import { useUpdateSaleStatus } from "@/features/payments/hooks";
import type { SaleStatus } from "@/features/payments/services/orders.service";
import type { Order } from "@/types";

// Mirrors the server's allowed fulfilment steps; the server remains authoritative.
const NEXT: Record<string, SaleStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
};

/** Lets a seller move one of their order lines to its next fulfilment step. */
export function SaleStatusControl({ line }: { line: Order }) {
  const { toast } = useToast();
  const update = useUpdateSaleStatus();
  const [next, setNext] = useState<SaleStatus | "">("");
  const [tracking, setTracking] = useState("");
  const options = NEXT[line.status] ?? [];
  if (!options.length) return null;

  const save = () => {
    if (!next) return;
    update.mutate(
      { id: line.id, status: next, trackingNumber: tracking.trim() || undefined },
      {
        onSuccess: () => {
          setNext("");
          setTracking("");
          toast({ title: `Order marked ${next}`, description: line.productTitle });
        },
        onError: (error) =>
          toast({
            variant: "destructive",
            title: "Order not updated",
            description: apiErrorMessage(error, "Please try again."),
          }),
      },
    );
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 normal-case">
      <select
        aria-label={`Update status of ${line.productTitle}`}
        value={next}
        onChange={(e) => setNext(e.target.value as SaleStatus | "")}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
      >
        <option value="">Update…</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {s === "cancelled" ? "Cancel order" : `Mark ${s}`}
          </option>
        ))}
      </select>
      {next === "shipped" && (
        <Input
          aria-label="Tracking number (optional)"
          placeholder="Tracking no. (optional)"
          value={tracking}
          maxLength={100}
          onChange={(e) => setTracking(e.target.value)}
          className="h-7 w-40 text-xs"
        />
      )}
      {next && (
        <Button size="sm" className="h-7 text-xs" disabled={update.isPending} onClick={save}>
          Save
        </Button>
      )}
    </div>
  );
}
