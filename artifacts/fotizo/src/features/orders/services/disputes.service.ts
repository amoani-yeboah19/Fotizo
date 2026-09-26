import { api } from "@/api";

export type DisputeCategory = "not_received" | "damaged" | "not_as_described" | "wrong_item" | "delivery" | "other";
export type DisputeStatus = "open" | "reviewing" | "escalated" | "resolved";

export interface BuyerDispute {
  id: string;
  reference: string;
  category: DisputeCategory;
  categoryLabel: string;
  status: DisputeStatus;
  createdAt: string;
}

export const DISPUTE_CATEGORIES: { value: DisputeCategory; label: string }[] = [
  { value: "not_received", label: "Item not received" },
  { value: "damaged", label: "Damaged item" },
  { value: "not_as_described", label: "Not as described" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "delivery", label: "Delivery problem" },
  { value: "other", label: "Other" },
];

/** What the buyer sees for each stage of a dispute. */
export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Received",
  reviewing: "Under review",
  escalated: "Refund review requested",
  resolved: "Resolved",
};

// Problems are reported per checkout (orderId), which may span several items.
export const disputesService = {
  list: (orderId: string) => api.get<BuyerDispute[]>(`/orders/${orderId}/disputes`),
  open: (orderId: string, input: { category: DisputeCategory; summary: string }) =>
    api.post<BuyerDispute>(`/orders/${orderId}/disputes`, input),
};
