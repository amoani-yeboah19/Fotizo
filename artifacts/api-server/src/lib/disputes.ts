import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  disputesTable,
  orderItemsTable,
  ordersTable,
  usersTable,
  type DisputeCategory,
  type DisputeStatus,
} from "@workspace/db";

export type DisputeAction = "start_review" | "escalate_refund" | "resolve" | "reopen";

/** Allowed actions per status and where each leads. Matches the manager UI. */
export const DISPUTE_ACTIONS: Record<DisputeStatus, Partial<Record<DisputeAction, DisputeStatus>>> = {
  open: { start_review: "reviewing", escalate_refund: "escalated", resolve: "resolved" },
  reviewing: { escalate_refund: "escalated", resolve: "resolved" },
  escalated: { resolve: "resolved" },
  resolved: { reopen: "open" },
};

export const DISPUTE_ACTION_LABELS: Record<DisputeAction, string> = {
  start_review: "Start review",
  escalate_refund: "Request refund review",
  resolve: "Resolve without refund",
  reopen: "Reopen dispute",
};

export const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  not_received: "Item not received",
  damaged: "Damaged item",
  not_as_described: "Not as described",
  wrong_item: "Wrong item",
  delivery: "Delivery problem",
  other: "Other",
};

/** Problems that leave a buyer without usable goods are reviewed first. */
export const disputePriority = (category: DisputeCategory) =>
  category === "not_received" || category === "damaged" ? "high" : "normal";

type LineStatus = (typeof orderItemsTable.$inferSelect)["status"];

// Mirrors the SQL rollup used for filtering in the manager order list.
export function orderState(statuses: LineStatus[]) {
  const all = (allowed: LineStatus[]) => statuses.every((s) => allowed.includes(s));
  if (all(["cancelled"])) return "cancelled" as const;
  if (all(["delivered", "cancelled"])) return "delivered" as const;
  if (all(["shipped", "delivered", "cancelled"])) return "shipped" as const;
  if (statuses.some((s) => s !== "pending" && s !== "cancelled")) return "processing" as const;
  return "pending" as const;
}

const distinct = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => !!v))];

/**
 * Orders as the manager workspace shows them: buyer, sellers, line items,
 * delivery, payment and a timeline built from stored events. Keyed by order id.
 */
export async function managedOrders(ids: string[]) {
  const result = new Map<string, ReturnType<typeof buildOrder>>();
  if (!ids.length) return result;
  const [orders, lines, disputes] = await Promise.all([
    db
      .select({ order: ordersTable, buyerName: usersTable.name, buyerEmail: usersTable.email })
      .from(ordersTable)
      .innerJoin(usersTable, eq(usersTable.id, ordersTable.buyerId))
      .where(inArray(ordersTable.id, ids)),
    db
      .select({ line: orderItemsTable, sellerEmail: usersTable.email })
      .from(orderItemsTable)
      .leftJoin(usersTable, eq(usersTable.id, orderItemsTable.sellerId))
      .where(inArray(orderItemsTable.orderId, ids))
      .orderBy(asc(orderItemsTable.productTitle)),
    db
      .select({ orderId: disputesTable.orderId, reference: disputesTable.reference, createdAt: disputesTable.createdAt })
      .from(disputesTable)
      .where(inArray(disputesTable.orderId, ids))
      .orderBy(desc(disputesTable.createdAt)),
  ]);
  for (const row of orders) {
    result.set(
      row.order.id,
      buildOrder(
        row,
        lines.filter((l) => l.line.orderId === row.order.id),
        disputes.filter((d) => d.orderId === row.order.id),
      ),
    );
  }
  return result;
}

function buildOrder(
  row: { order: typeof ordersTable.$inferSelect; buyerName: string; buyerEmail: string },
  lines: { line: typeof orderItemsTable.$inferSelect; sellerEmail: string | null }[],
  disputes: { reference: string; createdAt: Date }[],
) {
  const { order } = row;
  const timeline = [
    { id: `${order.id}:placed`, label: "Order placed", detail: `${lines.length} item line${lines.length === 1 ? "" : "s"}`, createdAt: order.createdAt },
    ...(order.paidAt
      ? [{ id: `${order.id}:paid`, label: "Payment recorded", detail: order.paymentMethod ?? "Payment", createdAt: order.paidAt }]
      : []),
    ...disputes.map((d) => ({ id: `${order.id}:${d.reference}`, label: "Dispute opened", detail: d.reference, createdAt: d.createdAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return {
    id: order.id,
    reference: order.reference ?? `FTZ-${order.id.slice(0, 8).toUpperCase()}`,
    buyer: { name: row.buyerName, email: row.buyerEmail },
    seller: {
      name: distinct(lines.map((l) => l.line.seller)).join(", ") || "Unknown seller",
      email: distinct(lines.map((l) => l.sellerEmail)).join(", "),
    },
    createdAt: order.createdAt.toISOString(),
    status: orderState(lines.map((l) => l.line.status)),
    payment: order.paymentStatus === "paid" ? ("paid" as const) : ("pending" as const),
    currency: order.currency,
    items: lines.map((l) => ({ title: l.line.productTitle, quantity: l.line.quantity, unitPrice: l.line.price })),
    deliveryFee: order.shipping,
    total: order.total,
    delivery: {
      destination: [order.city, order.country].filter(Boolean).join(", ") || "Not recorded",
      carrier: null,
      tracking: distinct(lines.map((l) => l.line.trackingNumber)).join(", ") || null,
      exception: null,
    },
    timeline: timeline.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
  };
}
