import { api, ADMIN_USE_MOCKS } from "@/api";
import type { UserRole } from "@/types";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  verified: boolean;
  status: "active" | "suspended";
  createdAt: string;
}
export interface AdminListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  owner: string;
  ownerId: string;
  status: "active" | "unpublished";
  createdAt: string;
}
export interface AdminAudit {
  id: string;
  actor: string;
  action: string;
  targetId: string;
  targetLabel: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
}
export interface AdminOverview {
  totalUsers: number;
  newUsersThisMonth: number;
  unverifiedUsers: number;
  activeProducts: number;
  activeServices: number;
  ordersThisMonth: number;
  unpublishedProducts: number;
  unpublishedServices: number;
}
export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export type AdminDecision = { id: string; reason: string } & (
  | { kind: "user"; verified: boolean; expected: boolean }
  | {
      kind: "product" | "service";
      status: "active" | "unpublished";
      expected: "active" | "unpublished";
    }
);

// Demo records remain in memory and are never sent to staff APIs.
const demoUsers: AdminUser[] = [
  {
    id: "demo-user-1",
    name: "Ama Mensah",
    email: "ama@example.com",
    role: "seller",
    verified: false,
    status: "active",
    createdAt: "2026-09-20T10:00:00Z",
  },
  {
    id: "demo-user-2",
    name: "Kwame Asante",
    email: "kwame@example.com",
    role: "buyer",
    verified: true,
    status: "suspended",
    createdAt: "2026-09-19T10:00:00Z",
  },
];
const demoListings: Record<"product" | "service", AdminListing[]> = {
  product: [
    {
      id: "demo-product-1",
      title: "Cordless drill set",
      description:
        "18V cordless drill with two batteries, charger and carrying case.",
      price: 120,
      category: "Tools",
      owner: "Ama Mensah",
      ownerId: "demo-user-1",
      status: "unpublished",
      createdAt: "2026-09-21T10:00:00Z",
    },
  ],
  service: [
    {
      id: "demo-service-1",
      title: "Home electrical repairs",
      description:
        "Residential electrical fault diagnosis and repairs. Available weekdays by appointment.",
      price: 35,
      category: "Electrical",
      owner: "Ama Mensah",
      ownerId: "demo-user-1",
      status: "active",
      createdAt: "2026-09-21T10:00:00Z",
    },
  ],
};
const demoAudit: AdminAudit[] = [];
export function recordDemoAdminAudit(entry: AdminAudit) {
  if (!ADMIN_USE_MOCKS)
    throw new Error("Demo audit is unavailable in live mode.");
  demoAudit.unshift(structuredClone(entry));
}
function paginate<T>(items: T[], page: number): AdminPage<T> {
  return {
    items: structuredClone(items.slice((page - 1) * 20, page * 20)),
    total: items.length,
    page,
    pageSize: 20,
  };
}
export const ADMIN_ROLES: UserRole[] = [
  "buyer",
  "seller",
  "manager",
  "developer",
  "representative",
  "china_representative",
];
export type AccountChange = { id: string; reason: string } & (
  | {
      action: "status";
      value: AdminUser["status"];
      expected: AdminUser["status"];
    }
  | { action: "role"; value: UserRole; expected: UserRole }
);
export interface AdminUserDetails {
  user: AdminUser;
  listings: (AdminListing & { kind: "product" | "service" })[];
  activity: AdminAudit[];
}
export const adminService = {
  async userDetails(id: string): Promise<AdminUserDetails> {
    if (!ADMIN_USE_MOCKS) return api.get(`/admin/users/${id}`);
    const user = demoUsers.find((u) => u.id === id);
    if (!user) throw new Error("User not found.");
    return structuredClone({
      user,
      listings: [
        ...demoListings.product.map((l) => ({
          ...l,
          kind: "product" as const,
        })),
        ...demoListings.service.map((l) => ({
          ...l,
          kind: "service" as const,
        })),
      ].filter((l) => l.ownerId === id),
      activity: demoAudit.filter((a) => a.targetId === id),
    });
  },
  async changeAccount(change: AccountChange): Promise<void> {
    if (!ADMIN_USE_MOCKS) {
      await api.post(`/admin/users/${change.id}/account`, change);
      return;
    }
    const reason = change.reason.trim();
    if (reason.length < 5 || reason.length > 1000)
      throw new Error("Enter a reason of 5–1000 characters.");
    const user = demoUsers.find((u) => u.id === change.id);
    if (!user) throw new Error("User not found.");
    const previous = user[change.action];
    if (previous !== change.expected)
      throw new Error(
        "This account changed. Cancel and refresh before trying again.",
      );
    if (previous === change.value) throw new Error("Choose a different value.");
    if (change.action === "role") {
      if (!ADMIN_ROLES.includes(change.value))
        throw new Error("Choose a valid role.");
      user.role = change.value;
    } else {
      if (!["active", "suspended"].includes(change.value))
        throw new Error("Choose a valid account status.");
      user.status = change.value;
    }
    demoAudit.unshift({
      id: crypto.randomUUID(),
      actor: "Demo manager",
      action:
        change.action === "role"
          ? "user.change_role"
          : change.value === "suspended"
            ? "user.suspend"
            : "user.reinstate",
      targetId: user.id,
      targetLabel: user.name,
      reason,
      before: { [change.action]: previous },
      after: { [change.action]: change.value },
      createdAt: new Date().toISOString(),
    });
  },
  async overview(): Promise<AdminOverview> {
    if (!ADMIN_USE_MOCKS) return api.get("/admin/overview");
    const { demoOrdersThisMonth } = await import("./demo-operations.service");
    return {
      totalUsers: demoUsers.length,
      newUsersThisMonth: demoUsers.filter(
        (u) => u.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7),
      ).length,
      unverifiedUsers: demoUsers.filter((u) => !u.verified).length,
      activeProducts: demoListings.product.filter((l) => l.status === "active")
        .length,
      activeServices: demoListings.service.filter((l) => l.status === "active")
        .length,
      ordersThisMonth: demoOrdersThisMonth(),
      unpublishedProducts: demoListings.product.filter(
        (l) => l.status === "unpublished",
      ).length,
      unpublishedServices: demoListings.service.filter(
        (l) => l.status === "unpublished",
      ).length,
    };
  },
  async users(filters: {
    page: number;
    search: string;
    role: string;
    verification: string;
  }): Promise<AdminPage<AdminUser>> {
    if (!ADMIN_USE_MOCKS)
      return api.get("/admin/users", {
        ...filters,
        role: filters.role || undefined,
        verification: filters.verification || undefined,
      });
    return paginate(
      demoUsers.filter(
        (u) =>
          `${u.name} ${u.email}`
            .toLowerCase()
            .includes(filters.search.toLowerCase()) &&
          (!filters.role || u.role === filters.role) &&
          (!filters.verification ||
            u.verified === (filters.verification === "verified")),
      ),
      filters.page,
    );
  },
  async listings(filters: {
    page: number;
    search: string;
    kind: "product" | "service";
    status: string;
  }): Promise<AdminPage<AdminListing>> {
    if (!ADMIN_USE_MOCKS)
      return api.get("/admin/listings", {
        ...filters,
        status: filters.status || undefined,
      });
    return paginate(
      demoListings[filters.kind].filter(
        (l) =>
          l.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          (!filters.status || l.status === filters.status),
      ),
      filters.page,
    );
  },
  async audit(page: number): Promise<AdminPage<AdminAudit>> {
    return ADMIN_USE_MOCKS
      ? paginate(demoAudit, page)
      : api.get("/admin/audit", { page });
  },
  async decide(d: AdminDecision): Promise<void> {
    if (!ADMIN_USE_MOCKS) {
      await api.post(`/admin/decisions/${d.id}`, d);
      return;
    }
    let before: Record<string, unknown>,
      after: Record<string, unknown>,
      label: string;
    if (d.kind === "user") {
      const u = demoUsers.find((u) => u.id === d.id);
      if (!u || u.verified !== d.expected)
        throw new Error("Record changed. Refresh and review it again.");
      before = { verified: u.verified };
      after = { verified: d.verified };
      label = u.name;
      u.verified = d.verified;
    } else {
      const l = demoListings[d.kind].find((l) => l.id === d.id);
      if (!l || l.status !== d.expected)
        throw new Error("Record changed. Refresh and review it again.");
      before = { status: l.status };
      after = { status: d.status };
      label = l.title;
      l.status = d.status;
    }
    demoAudit.unshift({
      id: crypto.randomUUID(),
      actor: "Demo manager",
      action:
        d.kind === "user"
          ? d.verified
            ? "user.verify"
            : "user.revoke_verification"
          : `${d.kind}.${d.status === "active" ? "publish" : "unpublish"}`,
      targetId: d.id,
      targetLabel: label,
      reason: d.reason,
      before,
      after,
      createdAt: new Date().toISOString(),
    });
  },
};
