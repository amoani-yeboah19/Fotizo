import { AdminOperations } from "../components/AdminOperations";
import { AdminApprovalQueue } from "../components/AdminApprovalQueue";
import { AdminUserDetails } from "../components/AdminUserDetails";
import { CaseQueue, OrderPayments } from "../components/Operations";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Users,
  ShieldCheck,
  ClipboardList,
  RefreshCw,
  ArrowRight,
  ShoppingBag,
  Banknote,
  LifeBuoy,
  CarFront,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_USE_MOCKS, ApiError } from "@/api";
import { useDashboardSection } from "@/features/profile/hooks";
import {
  adminService,
  type AdminDecision,
  type AdminPage,
} from "@/features/profile/services/manager.service";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Section =
  | "overview"
  | "users"
  | "orders"
  | "payments"
  | "approvals"
  | "moderation"
  | "support"
  | "enquiries"
  | "audit";
// Queues served only by the live API; demo builds have no records for them.
const LIVE_ONLY: Section[] = ["payments", "support", "enquiries"];
type Review = {
  title: string;
  label: string;
  detail: string;
  decision:
    | Omit<Extract<AdminDecision, { kind: "user" }>, "reason">
    | Omit<Extract<AdminDecision, { kind: "product" | "service" }>, "reason">;
};
const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm";
const date = (value: string) => new Date(value).toLocaleDateString();
const roleLabel = (role: string) => role.replaceAll("_", " ");
function Pagination({
  data,
  onChange,
}: {
  data: AdminPage<unknown>;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border p-4 text-sm">
      <span className="text-muted-foreground">
        {data.total} records · Page {data.page} of{" "}
        {Math.max(1, Math.ceil(data.total / data.pageSize))}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={data.page <= 1}
          onClick={() => onChange(data.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={data.page * data.pageSize >= data.total}
          onClick={() => onChange(data.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
function failure(error: unknown) {
  if (
    error instanceof ApiError &&
    error.data &&
    typeof error.data === "object" &&
    "error" in error.data
  )
    return String(error.data.error);
  return error instanceof Error
    ? error.message
    : "Unable to save this decision.";
}

// Mount queries only after checking the role. Backend enforcement is required before integration.
export default function DashboardManager() {
  const { user } = useAuth();
  if (user?.role !== "manager")
    return (
      <DashboardLayout sidebar={null}>
        <ErrorState label="Manager access is required for this workspace." />
        <Link href="/dashboard" className="text-primary underline">
          Go to your dashboard
        </Link>
      </DashboardLayout>
    );
  return <ManagerWorkspace />;
}
function ManagerWorkspace() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const cache = useQueryClient();
  const [section, setSection] = useDashboardSection<Section>(
    ADMIN_USE_MOCKS
      ? ["overview", "users", "orders", "approvals", "moderation", "audit"]
      : ["overview", "users", "orders", "payments", "approvals", "moderation", "support", "enquiries", "audit"],
    "overview",
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [verification, setVerification] = useState("");
  const [kind, setKind] = useState<"product" | "service">("product");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<Review | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const filters = { page, search, role, verification };
  const listingFilters = { page, search, kind, status };
  const overview = useQuery({
    queryKey: ["admin", user?.id, "overview"],
    queryFn: adminService.overview,
  });
  const users = useQuery({
    queryKey: ["admin", user?.id, "users", filters],
    queryFn: () => adminService.users(filters),
    enabled: section === "users",
  });
  const listings = useQuery({
    queryKey: ["admin", user?.id, "listings", listingFilters],
    queryFn: () => adminService.listings(listingFilters),
    enabled: section === "moderation",
  });
  const audit = useQuery({
    queryKey: ["admin", user?.id, "audit", page],
    queryFn: () => adminService.audit(page),
    enabled: section === "audit",
  });
  const mutation = useMutation({
    mutationFn: adminService.decide,
    onSuccess: async () => {
      setReview(null);
      setReason("");
      setNotice("Decision saved and added to the audit trail.");
      await cache.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const navigate = (next: Section) => {
    setSection(next);
    setLocation(`/dashboard/manager?tab=${next}`);
    setPage(1);
    setSearch("");
    setNotice("");
  };
  const openReview = (item: Review) => {
    mutation.reset();
    setReason("");
    setReview(item);
    setNotice("");
  };
  const current =
    section === "overview" || section === "approvals" || section === "orders" || LIVE_ONLY.includes(section)
      ? overview
      : section === "users"
        ? users
        : section === "moderation"
          ? listings
          : audit;
  const sidebar = (
    <DashboardSidebar
      heading="Management"
      items={[
        {
          icon: <Activity className="w-4 h-4" />,
          label: "Overview",
          active: section === "overview",
          onClick: () => navigate("overview"),
        },
        {
          icon: <Users className="w-4 h-4" />,
          label: "Users",
          active: section === "users",
          onClick: () => navigate("users"),
        },
        {
          icon: <ShoppingBag className="w-4 h-4" />,
          label: "Orders & disputes",
          active: section === "orders",
          onClick: () => navigate("orders"),
        },
        ...(ADMIN_USE_MOCKS
          ? []
          : [
              {
                icon: <Banknote className="w-4 h-4" />,
                label: "Payments",
                active: section === "payments",
                onClick: () => navigate("payments"),
              },
            ]),
        {
          icon: <ShieldCheck className="w-4 h-4" />,
          label: "Approval queue",
          active: section === "approvals",
          onClick: () => navigate("approvals"),
        },
        {
          icon: <ShieldCheck className="w-4 h-4" />,
          label: "Publication controls",
          active: section === "moderation",
          onClick: () => navigate("moderation"),
        },
        ...(ADMIN_USE_MOCKS
          ? []
          : [
              {
                icon: <LifeBuoy className="w-4 h-4" />,
                label: "Support requests",
                active: section === "support",
                onClick: () => navigate("support"),
              },
              {
                icon: <CarFront className="w-4 h-4" />,
                label: "Vehicle enquiries",
                active: section === "enquiries",
                onClick: () => navigate("enquiries"),
              },
            ]),
        {
          icon: <ClipboardList className="w-4 h-4" />,
          label: "Audit trail",
          active: section === "audit",
          onClick: () => navigate("audit"),
        },
      ]}
    />
  );
  const titles = {
    overview: "Platform overview",
    users: "Users & verification",
    orders: "Orders & disputes",
    payments: "Payments",
    approvals: "Approval queue",
    support: "Support requests",
    enquiries: "Vehicle enquiries",
    moderation: "Publication controls",
    audit: "Audit trail",
  };
  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            Fotizo management
          </p>
          <h1 className="heading-page">{titles[section]}</h1>
          <p className="mt-2 text-muted-foreground">
            Oversee accounts, review listings and follow every decision.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => cache.invalidateQueries({ queryKey: ["admin"] })}
          disabled={current.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </header>
      {ADMIN_USE_MOCKS && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Demo workspace · Sample records. Changes reset when this page is
          reloaded.
        </div>
      )}
      {notice && (
        <p role="status" className="mb-4 text-sm text-primary">
          {notice}
        </p>
      )}
      {(section === "users" || section === "moderation") && (
        <div className="mb-5 flex flex-wrap gap-3">
          <Input
            aria-label={
              section === "users"
                ? "Search users by name or email"
                : "Search listings by title"
            }
            placeholder={
              section === "users"
                ? "Search name or email…"
                : "Search listing title…"
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
          {section === "users" ? (
            <>
              <select
                aria-label="Filter by role"
                className={selectClass}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All roles</option>
                {[
                  "buyer",
                  "seller",
                  "manager",
                  "developer",
                  "representative",
                  "china_representative",
                ].map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter verification"
                className={selectClass}
                value={verification}
                onChange={(e) => {
                  setVerification(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All verification states</option>
                <option value="unverified">Unverified</option>
                <option value="verified">Verified</option>
              </select>
            </>
          ) : (
            <>
              <select
                aria-label="Listing type"
                className={selectClass}
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as typeof kind);
                  setPage(1);
                }}
              >
                <option value="product">Products</option>
                <option value="service">Services</option>
              </select>
              <select
                aria-label="Publication status"
                className={selectClass}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All publication states</option>
                <option value="unpublished">Unpublished</option>
                <option value="active">Active</option>
              </select>
            </>
          )}
        </div>
      )}
      {section === "orders" ? (
        <AdminOperations />
      ) : section === "payments" ? (
        <OrderPayments />
      ) : section === "support" ? (
        <CaseQueue type="support" />
      ) : section === "enquiries" ? (
        <CaseQueue type="vehicle_enquiry" />
      ) : section === "approvals" ? (
        <AdminApprovalQueue />
      ) : current.isError ? (
        <ErrorState label="Unable to load management data. Use Refresh to try again." />
      ) : current.isPending ? (
        <Loading label="Loading management data…" />
      ) : (
        <>
          {section === "overview" && overview.data && (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <StatCard
                  label="Total users"
                  value={overview.data.totalUsers.toLocaleString()}
                  sub={
                    <p className="text-xs text-muted-foreground mt-2">
                      {overview.data.newUsersThisMonth} joined this month (UTC)
                    </p>
                  }
                />
                <StatCard
                  label="Active products"
                  value={overview.data.activeProducts.toLocaleString()}
                />
                <StatCard
                  label="Active services"
                  value={overview.data.activeServices.toLocaleString()}
                />
                <StatCard
                  label="Orders this month"
                  value={overview.data.ordersThisMonth.toLocaleString()}
                  sub={
                    <p className="text-xs text-muted-foreground mt-2">
                      Orders placed (UTC), not payments collected
                    </p>
                  }
                />
              </div>
              <SurfaceCard className="p-6 mb-6">
                <h2 className="text-lg font-bold mb-1">Review workspace</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Check account verification and unpublished listings before
                  taking action.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      label: "Unverified accounts",
                      count: overview.data.unverifiedUsers,
                      action: () => {
                        setVerification("unverified");
                        navigate("users");
                      },
                    },
                    {
                      label: "Unpublished products",
                      count: overview.data.unpublishedProducts,
                      action: () => {
                        setKind("product");
                        setStatus("unpublished");
                        navigate("moderation");
                      },
                    },
                    {
                      label: "Unpublished services",
                      count: overview.data.unpublishedServices,
                      action: () => {
                        setKind("service");
                        setStatus("unpublished");
                        navigate("moderation");
                      },
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="rounded-xl border border-border p-5 text-left hover:bg-muted/40"
                    >
                      <span className="text-3xl font-bold">{item.count}</span>
                      <span className="mt-3 flex items-center justify-between text-sm">
                        {item.label}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Unpublished listings include owner withdrawals. Unverified
                  accounts have not been marked verified; these counts are not
                  submitted approval requests.
                </p>
              </SurfaceCard>
              <SurfaceCard className="p-6">
                <h2 className="font-bold mb-2">Accountable decisions</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Verification and publication changes require a reason. Each
                  saved decision records the manager, time and previous value.
                </p>
                <Button variant="outline" onClick={() => navigate("audit")}>
                  View audit trail
                </Button>
              </SurfaceCard>
            </>
          )}
          {section === "users" && users.data && (
            <SurfaceCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      {[
                        "Account",
                        "Role",
                        "Joined",
                        "Status",
                        "Verification",
                        "Action",
                      ].map((h) => (
                        <th key={h} className="p-4 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.data.items.map((u) => (
                      <tr key={u.id}>
                        <td className="p-4">
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </td>
                        <td className="p-4 capitalize">{roleLabel(u.role)}</td>
                        <td className="p-4 whitespace-nowrap">
                          {date(u.createdAt)}
                        </td>
                        <td className="p-4">
                          <StatusBadge
                            tone={u.status === "active" ? "success" : "danger"}
                          >
                            {u.status}
                          </StatusBadge>
                        </td>
                        <td className="p-4">
                          <StatusBadge
                            tone={u.verified ? "success" : "warning"}
                          >
                            {u.verified ? "Verified" : "Unverified"}
                          </StatusBadge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUserId(u.id)}
                            >
                              View details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openReview({
                                  title: u.verified
                                    ? "Revoke verification"
                                    : "Verify account",
                                  label: u.name,
                                  detail: `${u.email} · ${roleLabel(u.role)} · Joined ${date(u.createdAt)}`,
                                  decision: {
                                    id: u.id,
                                    kind: "user",
                                    verified: !u.verified,
                                    expected: u.verified,
                                  },
                                })
                              }
                            >
                              Verification
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!users.data.items.length && (
                <p className="p-10 text-center text-muted-foreground">
                  No users match these filters.
                </p>
              )}
              <Pagination data={users.data} onChange={setPage} />
            </SurfaceCard>
          )}
          {section === "moderation" && listings.data && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Publishing makes a listing public. Unpublishing removes it from
                public browsing while retaining its record.
              </p>
              <SurfaceCard className="overflow-hidden">
                <div className="divide-y divide-border">
                  {listings.data.items.map((l) => (
                    <div
                      key={l.id}
                      className="p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <h2 className="font-semibold">{l.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {l.owner} · {l.category} · {date(l.createdAt)}
                        </p>
                        <div className="mt-2">
                          <StatusBadge
                            tone={l.status === "active" ? "success" : "warning"}
                          >
                            {l.status}
                          </StatusBadge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {l.status === "active" && (
                          <Button asChild size="sm" variant="ghost">
                            <Link
                              href={
                                kind === "product"
                                  ? `/products/${l.id}`
                                  : `/services/${l.id}`
                              }
                            >
                              View listing
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openReview({
                              title:
                                l.status === "active"
                                  ? "Unpublish listing"
                                  : "Publish listing",
                              label: l.title,
                              detail: `${l.owner} · ${l.category} · ${l.description} · ${kind === "product" ? "Price" : "Hourly rate"}: £${l.price.toFixed(2)}`,
                              decision: {
                                id: l.id,
                                kind,
                                status:
                                  l.status === "active"
                                    ? "unpublished"
                                    : "active",
                                expected: l.status,
                              },
                            })
                          }
                        >
                          {l.status === "active"
                            ? "Unpublish"
                            : "Review & publish"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {!listings.data.items.length && (
                  <p className="p-10 text-center text-muted-foreground">
                    No listings match these filters.
                  </p>
                )}
                <Pagination data={listings.data} onChange={setPage} />
              </SurfaceCard>
            </>
          )}
          {section === "audit" && audit.data && (
            <SurfaceCard className="overflow-hidden">
              <div className="divide-y divide-border">
                {audit.data.items.map((a) => (
                  <article key={a.id} className="p-5">
                    <div className="flex flex-wrap justify-between gap-2">
                      <h2 className="font-semibold">{a.targetLabel}</h2>
                      <time className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <p className="text-sm mt-1">
                      {a.actor} ·{" "}
                      {a.action.replaceAll("_", " ").replace(".", " / ")}
                    </p>
                    <p className="mt-3 text-sm whitespace-pre-wrap break-words">
                      {a.reason}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {Object.entries(a.before)
                        .map(
                          ([k, v]) =>
                            `${k}: ${String(v)} → ${String(a.after[k])}`,
                        )
                        .join(", ")}
                    </p>
                  </article>
                ))}
              </div>
              {!audit.data.items.length && (
                <p className="p-10 text-center text-muted-foreground">
                  No administrative decisions recorded yet.
                </p>
              )}
              <Pagination data={audit.data} onChange={setPage} />
            </SurfaceCard>
          )}
        </>
      )}
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setReview(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{review?.title}</DialogTitle>
            <DialogDescription>
              {review?.label} · {review?.detail}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (review)
                mutation.mutate({
                  ...review.decision,
                  reason: reason.trim(),
                } as AdminDecision);
            }}
          >
            <label
              htmlFor="decision-reason"
              className="block text-sm font-medium mb-2"
            >
              Reason for this decision
            </label>
            <textarea
              id="decision-reason"
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              disabled={mutation.isPending}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm"
              placeholder="Record the checks you completed and why this change is appropriate."
            />
            <p className="text-xs text-muted-foreground mt-2">
              This reason and the before/after values will be saved to the audit
              trail.
            </p>
            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive mt-3">
                {failure(mutation.error)}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setReview(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || reason.trim().length < 5}
              >
                {mutation.isPending ? "Saving…" : "Save decision"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {selectedUserId && (
        <AdminUserDetails
          key={selectedUserId}
          id={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </DashboardLayout>
  );
}
