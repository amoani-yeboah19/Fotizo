import { api, ADMIN_USE_MOCKS } from "@/api";
import { recordDemoAdminAudit, type AdminPage } from "./manager.service";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export interface ApprovalEvent {
  id: string;
  action: "submitted" | "resubmitted" | "approved" | "rejected";
  actor: string;
  reason: string;
  version: number;
  createdAt: string;
}
export interface ListingSubmission {
  id: string;
  listingId: string;
  title: string;
  kind: "product" | "service";
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
  seller: { id: string; name: string; email: string; verified: boolean };
  status: ApprovalStatus;
  version: number;
  submittedAt: string;
  history: ApprovalEvent[];
}
export interface ApprovalFilters {
  status: ApprovalStatus;
  kind: string;
  search: string;
  page: number;
}
export interface ApprovalDecision {
  id: string;
  expectedVersion: number;
  outcome: "approved" | "rejected";
  reason: string;
}
const seller = {
  id: "demo-user-1",
  name: "Ama Mensah",
  email: "ama@example.com",
  verified: false,
};
const submissions: ListingSubmission[] = [
  {
    id: "submission-1",
    listingId: "sample-headphones-1",
    title: "Wireless over-ear headphones",
    kind: "product",
    description:
      "Wireless headphones with cushioned ear pads and an adjustable headband. Includes a charging cable and carrying pouch. New condition; black finish.",
    category: "Electronics",
    price: 85,
    currency: "GBP",
    images: ["/images/product-1.webp"],
    seller,
    status: "pending",
    version: 1,
    submittedAt: "2026-09-25T09:00:00Z",
    history: [
      {
        id: "event-1",
        action: "submitted",
        actor: seller.name,
        reason: "New product listing submitted for review.",
        version: 1,
        createdAt: "2026-09-25T09:00:00Z",
      },
    ],
  },
  {
    id: "submission-2",
    listingId: "sample-service-1",
    title: "Residential electrical inspection",
    kind: "service",
    description:
      "A two-hour visual inspection of domestic sockets, switches and accessible wiring. Includes a written report. Repairs and replacement parts are quoted separately; appointments are available on weekdays.",
    category: "Electrical",
    price: 40,
    currency: "GBP",
    images: [],
    seller,
    status: "pending",
    version: 2,
    submittedAt: "2026-09-24T14:30:00Z",
    history: [
      {
        id: "event-4",
        action: "resubmitted",
        actor: seller.name,
        reason:
          "Added the inspection duration and clarified that repairs are not included.",
        version: 2,
        createdAt: "2026-09-24T14:30:00Z",
      },
      {
        id: "event-3",
        action: "rejected",
        actor: "Demo manager",
        reason:
          "Clarify the service duration and what the quoted rate includes.",
        version: 1,
        createdAt: "2026-09-23T11:00:00Z",
      },
      {
        id: "event-2",
        action: "submitted",
        actor: seller.name,
        reason: "Submitted inspection service.",
        version: 1,
        createdAt: "2026-09-22T08:00:00Z",
      },
    ],
  },
  {
    id: "submission-3",
    listingId: "sample-headphones-2",
    title: "Studio monitoring headphones",
    kind: "product",
    description:
      "Closed-back wired headphones for home recording, with a detachable cable and padded ear cups. Includes a 3.5 mm to 6.35 mm adapter.",
    category: "Electronics",
    price: 95,
    currency: "GBP",
    images: ["/images/product-1.webp"],
    seller,
    status: "approved",
    version: 1,
    submittedAt: "2026-09-21T09:00:00Z",
    history: [
      {
        id: "event-6",
        action: "approved",
        actor: "Demo manager",
        reason: "Description, product image and price reviewed.",
        version: 1,
        createdAt: "2026-09-22T10:00:00Z",
      },
      {
        id: "event-5",
        action: "submitted",
        actor: seller.name,
        reason: "Submitted studio headphones.",
        version: 1,
        createdAt: "2026-09-21T09:00:00Z",
      },
    ],
  },
  {
    id: "submission-4",
    listingId: "sample-service-2",
    title: "Whole-home rewiring",
    kind: "service",
    description:
      "Electrical rewiring service. Final scope and materials to be confirmed after a site visit.",
    category: "Electrical",
    price: 25,
    currency: "GBP",
    images: [],
    seller,
    status: "rejected",
    version: 1,
    submittedAt: "2026-09-20T09:00:00Z",
    history: [
      {
        id: "event-8",
        action: "rejected",
        actor: "Demo manager",
        reason:
          "The hourly rate and project scope are unclear. Specify labour, materials and assessment charges before resubmitting.",
        version: 1,
        createdAt: "2026-09-21T12:00:00Z",
      },
      {
        id: "event-7",
        action: "submitted",
        actor: seller.name,
        reason: "Submitted rewiring service.",
        version: 1,
        createdAt: "2026-09-20T09:00:00Z",
      },
    ],
  },
];
export const approvalsService = {
  async list(
    filters: ApprovalFilters,
  ): Promise<
    AdminPage<ListingSubmission> & { counts: Record<ApprovalStatus, number> }
  > {
    if (!ADMIN_USE_MOCKS)
      return api.get("/admin/approvals", {
        ...filters,
        kind: filters.kind || undefined,
      });
    const matched = submissions.filter(
      (s) =>
        (!filters.kind || s.kind === filters.kind) &&
        `${s.title} ${s.seller.name} ${s.seller.email}`
          .toLowerCase()
          .includes(filters.search.trim().toLowerCase()),
    );
    const rows = matched
      .filter((s) => s.status === filters.status)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return structuredClone({
      items: rows.slice((filters.page - 1) * 20, filters.page * 20),
      total: rows.length,
      page: filters.page,
      pageSize: 20,
      counts: {
        pending: matched.filter((s) => s.status === "pending").length,
        approved: matched.filter((s) => s.status === "approved").length,
        rejected: matched.filter((s) => s.status === "rejected").length,
      },
    });
  },
  async decide(d: ApprovalDecision): Promise<void> {
    if (!ADMIN_USE_MOCKS) {
      await api.post(`/admin/approvals/${d.id}/decision`, d);
      return;
    }
    const reason = d.reason.trim();
    if (reason.length < 5 || reason.length > 1000)
      throw new Error("Provide a reason of 5–1000 characters.");
    if (!["approved", "rejected"].includes(d.outcome))
      throw new Error("Invalid approval outcome.");
    const item = submissions.find((s) => s.id === d.id);
    if (!item) throw new Error("Submission not found.");
    if (item.status !== "pending" || item.version !== d.expectedVersion)
      throw new Error(
        "This submission changed. Close the review and refresh the queue.",
      );
    const createdAt = new Date().toISOString();
    item.status = d.outcome;
    item.history.unshift({
      id: crypto.randomUUID(),
      action: d.outcome,
      actor: "Demo manager",
      reason,
      version: item.version,
      createdAt,
    });
    recordDemoAdminAudit({
      id: crypto.randomUUID(),
      actor: "Demo manager",
      action: `submission.${d.outcome}`,
      targetId: item.id,
      targetLabel: item.title,
      reason,
      before: { status: "pending", version: item.version },
      after: { status: d.outcome, version: item.version },
      createdAt,
    });
  },
};
