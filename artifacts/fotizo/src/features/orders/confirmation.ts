import type { ConfirmationStatus, Order } from "@/types";

type Tone = "success" | "danger" | "info" | "warning";

/** Tone for a line's fulfilment status. */
export function purchaseStatusTone(status: string): Tone {
  return status === "delivered"
    ? "success"
    : status === "cancelled"
      ? "danger"
      : ["shipped", "in_transit"].includes(status)
        ? "info"
        : "warning";
}

// Imported goods are confirmed with the supplier before the buyer pays. Until
// the buyer accepts, the order's confirmation state says more than the line's
// "pending" fulfilment status.
const CONFIRMATION: Record<Exclude<ConfirmationStatus, "accepted">, { label: string; tone: Tone }> = {
  awaiting: { label: "Awaiting confirmation", tone: "warning" },
  quoted: { label: "Quote ready", tone: "info" },
  declined: { label: "Not available", tone: "danger" },
  withdrawn: { label: "Cancelled", tone: "danger" },
  expired: { label: "Quote expired", tone: "danger" },
};

/** The label and tone to show for a purchase line. */
export function purchaseStatus(order: Pick<Order, "status" | "confirmationStatus">): { label: string; tone: Tone } {
  const status = order.confirmationStatus;
  if (status && status !== "accepted") return CONFIRMATION[status];
  return { label: order.status.replaceAll("_", " "), tone: purchaseStatusTone(order.status) };
}

/** "12–20 days", "5 days", or null when no estimate was given. */
export function deliveryWindow(min: number | null, max: number | null): string | null {
  if (min === null || max === null) return null;
  return min === max ? `${min} day${min === 1 ? "" : "s"}` : `${min}–${max} days`;
}
