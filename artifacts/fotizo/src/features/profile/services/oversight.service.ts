import { ADMIN_USE_MOCKS, api } from "@/api";
import { recordDemoAdminAudit, type AdminPage } from "./manager.service";

export type OrderState =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
export type DisputeState = "open" | "reviewing" | "escalated" | "resolved";
export interface OrderEvent {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
}
export interface ManagedOrder {
  id: string;
  reference: string;
  buyer: { name: string; email: string };
  seller: { name: string; email: string };
  createdAt: string;
  status: OrderState;
  payment: "pending" | "paid" | "refunded";
  currency: string;
  items: { title: string; quantity: number; unitPrice: number }[];
  deliveryFee: number;
  total: number;
  delivery: {
    destination: string;
    carrier: string | null;
    tracking: string | null;
    exception: string | null;
  };
  timeline: OrderEvent[];
}
export interface ManagedDispute {
  id: string;
  reference: string;
  orderId: string;
  category: string;
  summary: string;
  status: DisputeState;
  priority: "normal" | "high";
  createdAt: string;
  version: number;
  evidence: { submittedBy: string; statement: string; createdAt: string }[];
  history: {
    id: string;
    actor: string;
    action: string;
    reason: string;
    createdAt: string;
  }[];
}
export type CaseAction =
  | "start_review"
  | "escalate_refund"
  | "resolve"
  | "reopen";
export interface DisputeDecision {
  id: string;
  action: CaseAction;
  expectedVersion: number;
  reason: string;
}
export interface OperationsFilters {
  page: number;
  search: string;
  status: string;
}
export const CASE_ACTIONS: Record<DisputeState, CaseAction[]> = {
  open: ["start_review", "escalate_refund", "resolve"],
  reviewing: ["escalate_refund", "resolve"],
  escalated: ["resolve"],
  resolved: ["reopen"],
};
export const CASE_ACTION_LABELS: Record<CaseAction, string> = {
  start_review: "Start review",
  escalate_refund: "Request refund review",
  resolve: "Resolve without refund",
  reopen: "Reopen dispute",
};
const orders: ManagedOrder[] = [
  {
    id: "ops-order-1",
    reference: "FOT-1042",
    buyer: { name: "Kwame Asante", email: "kwame@example.com" },
    seller: { name: "Ama Mensah", email: "ama@example.com" },
    createdAt: "2026-09-23T09:00:00Z",
    status: "shipped",
    payment: "paid",
    currency: "GBP",
    items: [{ title: "Cordless drill set", quantity: 1, unitPrice: 120 }],
    deliveryFee: 8,
    total: 128,
    delivery: {
      destination: "East Legon, Accra",
      carrier: "Demo courier",
      tracking: "DEMO-TRACK-1042",
      exception:
        "Delivery attempt failed; recipient requested a new delivery date.",
    },
    timeline: [
      {
        id: "o1-3",
        label: "Delivery exception",
        detail: "Recipient unavailable at first delivery attempt.",
        createdAt: "2026-09-25T08:00:00Z",
      },
      {
        id: "o1-2",
        label: "Shipped",
        detail: "Parcel handed to the demo courier.",
        createdAt: "2026-09-24T10:00:00Z",
      },
      {
        id: "o1-1",
        label: "Order placed",
        detail: "Payment marked paid in this sample record.",
        createdAt: "2026-09-23T09:00:00Z",
      },
    ],
  },
  {
    id: "ops-order-2",
    reference: "FOT-1041",
    buyer: { name: "Akosua Owusu", email: "akosua@example.com" },
    seller: { name: "Ama Mensah", email: "ama@example.com" },
    createdAt: "2026-09-22T11:00:00Z",
    status: "delivered",
    payment: "paid",
    currency: "GBP",
    items: [{ title: "Wireless headphones", quantity: 2, unitPrice: 85 }],
    deliveryFee: 6,
    total: 176,
    delivery: {
      destination: "Adenta, Accra",
      carrier: "Demo courier",
      tracking: "DEMO-TRACK-1041",
      exception: null,
    },
    timeline: [
      {
        id: "o2-2",
        label: "Delivered",
        detail: "Delivery marked complete by the courier.",
        createdAt: "2026-09-24T13:00:00Z",
      },
      {
        id: "o2-1",
        label: "Order placed",
        detail: "Two headphones ordered.",
        createdAt: "2026-09-22T11:00:00Z",
      },
    ],
  },
  {
    id: "ops-order-3",
    reference: "FOT-1040",
    buyer: { name: "Kofi Boateng", email: "kofi@example.com" },
    seller: { name: "Ama Mensah", email: "ama@example.com" },
    createdAt: "2026-09-21T12:00:00Z",
    status: "processing",
    payment: "paid",
    currency: "GBP",
    items: [{ title: "Studio headphones", quantity: 1, unitPrice: 95 }],
    deliveryFee: 5,
    total: 100,
    delivery: {
      destination: "Kumasi",
      carrier: null,
      tracking: null,
      exception: null,
    },
    timeline: [
      {
        id: "o3-1",
        label: "Preparing order",
        detail: "Seller is preparing the parcel.",
        createdAt: "2026-09-22T09:00:00Z",
      },
    ],
  },
  {
    id: "ops-order-4",
    reference: "FOT-1039",
    buyer: { name: "Esi Arthur", email: "esi@example.com" },
    seller: { name: "Ama Mensah", email: "ama@example.com" },
    createdAt: "2026-09-20T10:00:00Z",
    status: "cancelled",
    payment: "refunded",
    currency: "GBP",
    items: [{ title: "Desk lamp", quantity: 1, unitPrice: 30 }],
    deliveryFee: 5,
    total: 35,
    delivery: {
      destination: "Tema",
      carrier: null,
      tracking: null,
      exception: null,
    },
    timeline: [
      {
        id: "o4-1",
        label: "Cancelled and refunded",
        detail:
          "Historical sample only; no refund is issued by this workspace.",
        createdAt: "2026-09-21T09:00:00Z",
      },
    ],
  },
  {
    id: "ops-order-5",
    reference: "FOT-1038",
    buyer: { name: "Abena Osei", email: "abena@example.com" },
    seller: { name: "Ama Mensah", email: "ama@example.com" },
    createdAt: "2026-09-19T10:00:00Z",
    status: "pending",
    payment: "pending",
    currency: "GBP",
    items: [{ title: "Desk lamp", quantity: 1, unitPrice: 30 }],
    deliveryFee: 5,
    total: 35,
    delivery: {
      destination: "Cape Coast",
      carrier: null,
      tracking: null,
      exception: null,
    },
    timeline: [
      {
        id: "o5-1",
        label: "Awaiting payment",
        detail: "Order placed; payment confirmation is pending.",
        createdAt: "2026-09-19T10:00:00Z",
      },
    ],
  },
];
const disputes: ManagedDispute[] = [
  {
    id: "ops-case-1",
    reference: "DSP-201",
    orderId: "ops-order-1",
    category: "Delivery delay",
    summary:
      "The buyer reports that the order has not arrived and asks for a delivery update.",
    status: "open",
    priority: "high",
    createdAt: "2026-09-25T10:00:00Z",
    version: 1,
    evidence: [
      {
        submittedBy: "Kwame Asante",
        statement:
          "I missed the courier yesterday. Please confirm when they can deliver again.",
        createdAt: "2026-09-25T10:00:00Z",
      },
    ],
    history: [],
  },
  {
    id: "ops-case-2",
    reference: "DSP-200",
    orderId: "ops-order-2",
    category: "Damaged item",
    summary:
      "One of the two headphones arrived with a damaged ear cup. The buyer requests a refund review.",
    status: "reviewing",
    priority: "high",
    createdAt: "2026-09-24T15:00:00Z",
    version: 1,
    evidence: [
      {
        submittedBy: "Akosua Owusu",
        statement:
          "The left ear cup on one unit is cracked. The second unit is fine.",
        createdAt: "2026-09-24T15:00:00Z",
      },
      {
        submittedBy: "Ama Mensah",
        statement: "Please retain the packaging while the damage is reviewed.",
        createdAt: "2026-09-24T16:00:00Z",
      },
    ],
    history: [
      {
        id: "case-seed-1",
        actor: "Demo manager",
        action: "Review started",
        reason: "Checking the buyer report with the seller.",
        createdAt: "2026-09-24T16:30:00Z",
      },
    ],
  },
  {
    id: "ops-case-3",
    reference: "DSP-199",
    orderId: "ops-order-3",
    category: "Address correction",
    summary:
      "Buyer requested a correction to the delivery city before dispatch.",
    status: "resolved",
    priority: "normal",
    createdAt: "2026-09-22T08:00:00Z",
    version: 1,
    evidence: [
      {
        submittedBy: "Kofi Boateng",
        statement: "Please deliver to Kumasi, as confirmed with the seller.",
        createdAt: "2026-09-22T08:00:00Z",
      },
    ],
    history: [
      {
        id: "case-seed-2",
        actor: "Demo manager",
        action: "Resolved without refund",
        reason:
          "Seller confirmed the destination was corrected before shipping.",
        createdAt: "2026-09-22T10:00:00Z",
      },
    ],
  },
];
function pageOf<T>(items: T[], page: number): AdminPage<T> {
  return structuredClone({
    items: items.slice((page - 1) * 20, page * 20),
    total: items.length,
    page,
    pageSize: 20,
  });
}
const orderMatches = (o: ManagedOrder, search: string) =>
  `${o.reference} ${o.buyer.name} ${o.buyer.email} ${o.seller.name} ${o.seller.email}`
    .toLowerCase()
    .includes(search.trim().toLowerCase());
export const operationsService = {
  async orders(filters: OperationsFilters): Promise<AdminPage<ManagedOrder>> {
    if (!ADMIN_USE_MOCKS)
      return api.get("/admin/orders", {
        ...filters,
        status: filters.status || undefined,
      });
    return pageOf(
      orders.filter(
        (o) =>
          (!filters.status || o.status === filters.status) &&
          orderMatches(o, filters.search),
      ),
      filters.page,
    );
  },
  async disputes(
    filters: OperationsFilters,
  ): Promise<AdminPage<ManagedDispute & { order: ManagedOrder }>> {
    if (!ADMIN_USE_MOCKS)
      return api.get("/admin/disputes", {
        ...filters,
        status: filters.status || undefined,
      });
    return pageOf(
      disputes
        .map((d) => ({ ...d, order: orders.find((o) => o.id === d.orderId)! }))
        .filter(
          (d) =>
            (!filters.status || d.status === filters.status) &&
            (orderMatches(d.order, filters.search) ||
              `${d.reference} ${d.category}`
                .toLowerCase()
                .includes(filters.search.trim().toLowerCase())),
        ),
      filters.page,
    );
  },
  async order(
    id: string,
  ): Promise<{ order: ManagedOrder; disputes: ManagedDispute[] }> {
    if (!ADMIN_USE_MOCKS) return api.get(`/admin/orders/${id}`);
    const order = orders.find((o) => o.id === id);
    if (!order) throw new Error("Order not found.");
    return structuredClone({
      order,
      disputes: disputes.filter((d) => d.orderId === id),
    });
  },
  async decide(d: DisputeDecision): Promise<void> {
    if (!ADMIN_USE_MOCKS) {
      await api.post(`/admin/disputes/${d.id}/decisions`, d);
      return;
    }
    const item = disputes.find((c) => c.id === d.id);
    if (!item) throw new Error("Dispute not found.");
    if (item.version !== d.expectedVersion)
      throw new Error(
        "This dispute changed. Cancel and refresh before trying again.",
      );
    if (!CASE_ACTIONS[item.status].includes(d.action))
      throw new Error(
        "This action is not available for the current dispute status.",
      );
    const reason = d.reason.trim();
    if (reason.length < 5 || reason.length > 1000)
      throw new Error("Provide a reason of 5–1000 characters.");
    const before = { status: item.status, version: item.version };
    item.status =
      d.action === "start_review"
        ? "reviewing"
        : d.action === "escalate_refund"
          ? "escalated"
          : d.action === "reopen"
            ? "open"
            : "resolved";
    item.version += 1;
    const createdAt = new Date().toISOString();
    item.history.unshift({
      id: crypto.randomUUID(),
      actor: "Demo manager",
      action: CASE_ACTION_LABELS[d.action],
      reason,
      createdAt,
    });
    recordDemoAdminAudit({
      id: crypto.randomUUID(),
      actor: "Demo manager",
      action: `dispute.${d.action}`,
      targetId: item.id,
      targetLabel: item.reference,
      reason,
      before,
      after: { status: item.status, version: item.version },
      createdAt,
    });
  },
};

export function demoOrdersThisMonth(): number {
  const month = new Date().toISOString().slice(0, 7);
  return orders.filter(order => order.createdAt.slice(0, 7) === month).length;
}
