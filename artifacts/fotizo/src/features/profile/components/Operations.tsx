import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_USE_MOCKS, apiErrorMessage } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Price } from "@/components/common/Price";
import { chartColors, chartAxisTick, chartTooltipStyle } from "@/constants/chart";
import { vehicleName } from "@/features/autos/data/vehicles";
import {
  operationsService,
  type CaseType,
  type Page,
  type SupportCase,
  type EnquiryCase,
} from "../services/operations.service";

// Staff panels backed by /api/operations. Every figure is read from stored
// records; nothing here is illustrative.

export function useStaffQuery<T>(key: readonly unknown[], queryFn: () => Promise<T>) {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["operations", user?.id, ...key],
    queryFn,
    enabled: isAuthenticated && !AUTH_USE_MOCKS,
  });
}

export function Failure({ retry, label = "These records could not be loaded." }: { retry: () => void; label?: string }) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-white p-4 space-y-3">
      <p className="text-sm">{label} Check your connection, then retry.</p>
      <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
    </div>
  );
}

export function Paging({
  page, hasMore, pending, change,
}: { page: number; hasMore: boolean; pending: boolean; change: (page: number) => void }) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-4 p-4 border-t border-border">
      <Button variant="outline" size="sm" disabled={page === 0 || pending} onClick={() => change(page - 1)}>
        Previous
      </Button>
      <span className="text-sm">Page {page + 1}</span>
      <Button variant="outline" size="sm" disabled={!hasMore || pending} onClick={() => change(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const words = (s: string) => s.replace(/_/g, " ");

export function OperationsOverviewPanel({ focus = "platform" }: { focus?: "platform" | "sourcing" }) {
  const query = useStaffQuery(["overview"], operationsService.overview);
  if (query.isError) return <Failure retry={() => void query.refetch()} />;
  const o = query.data;
  if (!o) return <p role="status" className="text-muted-foreground">Loading figures…</p>;
  const topShare = o.topCategories[0]?.listings || 1;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {focus === "platform" ? (
          <>
            <StatCard label="Order value this month" value={<Price amount={o.orders.valueThisMonth} />} valueClassName="text-primary"
              sub={<p className="text-xs text-muted-foreground mt-2">{o.orders.linesThisMonth} order lines · excludes cancelled</p>} />
            <StatCard label="Buyers" value={o.users.buyers.toLocaleString()}
              sub={<p className="text-xs text-muted-foreground mt-2">{o.users.newThisMonth} new accounts this month</p>} />
            <StatCard label="Sellers" value={o.users.sellers.toLocaleString()}
              sub={<p className="text-xs text-muted-foreground mt-2">{o.users.suspended} suspended accounts</p>} />
            <StatCard label="Live listings" value={(o.listings.marketplace + o.listings.shop).toLocaleString()}
              sub={<p className="text-xs text-muted-foreground mt-2">{o.listings.services} services · {o.listings.unpublished} unpublished</p>} />
          </>
        ) : (
          <>
            <StatCard label="Live shop listings" value={o.listings.shop.toLocaleString()}
              sub={<p className="text-xs text-muted-foreground mt-2">{o.listings.lowStock} live listings with 5 or fewer in stock</p>} />
            <StatCard label="Published vehicles" value={`${o.vehicles.active} of ${o.vehicles.total}`} />
            <StatCard label="New vehicle enquiries" value={o.vehicleEnquiries.new.toLocaleString()}
              sub={<p className="text-xs text-muted-foreground mt-2">{o.vehicleEnquiries.active} being handled</p>} />
            <StatCard label="Open support cases" value={(o.support.open + o.support.inProgress).toLocaleString()} />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <SurfaceCard className="lg:col-span-2 p-6">
          <h3 className="text-lg font-bold">Order value by month</h3>
          <p className="text-xs text-muted-foreground mb-6">
            Recorded order lines, excluding cancelled. Online payment is not enabled, so this is not collected revenue.
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={o.orders.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={chartAxisTick} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} dx={-10} tickFormatter={(v) => `£${v}`} />
                <RechartsTooltip cursor={{ fill: chartColors.cursor }} contentStyle={chartTooltipStyle}
                  formatter={(v: number) => [`£${v.toLocaleString()}`, "Order value"]} />
                <Bar dataKey="value" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-6">
          <h3 className="text-lg font-bold mb-1">Top marketplace categories</h3>
          <p className="text-xs text-muted-foreground mb-6">By live listings</p>
          {o.topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No live marketplace listings yet.</p>
          ) : (
            <div className="space-y-4">
              {o.topCategories.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{c.category}</span>
                    <span className="text-muted-foreground">{c.listings}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(c.listings / topShare) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

function TableShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border"><h3 className="text-lg font-bold">{title}</h3></div>
      {children}
    </SurfaceCard>
  );
}

export function SellerDirectory() {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const query = useStaffQuery(["sellers", page, q], () => operationsService.sellers(page, q));
  return (
    <TableShell title="Sellers">
      <form
        className="flex gap-2 p-4 border-b border-border"
        onSubmit={(e) => { e.preventDefault(); setPage(0); setQ(search.trim()); }}
      >
        <Label htmlFor="seller-search" className="sr-only">Search sellers</Label>
        <Input id="seller-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" maxLength={120} />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      {query.isError ? (
        <div className="p-4"><Failure retry={() => void query.refetch()} /></div>
      ) : !query.data ? (
        <p role="status" className="p-6 text-muted-foreground">Loading sellers…</p>
      ) : query.data.items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">{q ? "No sellers match that search." : "No seller accounts yet."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Seller</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium">Live listings</th>
                <th className="px-6 py-3 font-medium">Order value</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {query.data.items.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-3">{s.activeListings}</td>
                  <td className="px-6 py-3"><Price amount={s.orderValue} /> <span className="text-xs text-muted-foreground">({s.orderLines} lines)</span></td>
                  <td className="px-6 py-3">
                    <StatusBadge tone={s.suspendedAt ? "danger" : "success"}>{s.suspendedAt ? "suspended" : "active"}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.data && <Paging page={page} hasMore={query.data.hasMore} pending={query.isFetching} change={setPage} />}
    </TableShell>
  );
}

export function OrderLedger() {
  const [page, setPage] = useState(0);
  const query = useStaffQuery(["orders", page], () => operationsService.orders(page));
  return (
    <TableShell title="Order lines">
      {query.isError ? (
        <div className="p-4"><Failure retry={() => void query.refetch()} /></div>
      ) : !query.data ? (
        <p role="status" className="p-6 text-muted-foreground">Loading orders…</p>
      ) : query.data.items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No orders have been recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Order</th>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Buyer</th>
                <th className="px-6 py-3 font-medium">Seller</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {query.data.items.map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {o.orderId.slice(0, 8)}
                    <p className="font-sans">{new Date(o.createdAt).toLocaleDateString("en-GB")}</p>
                  </td>
                  <td className="px-6 py-3 font-medium">{o.productTitle} <span className="text-muted-foreground">×{o.quantity}</span></td>
                  <td className="px-6 py-3 text-muted-foreground">{o.buyer}</td>
                  <td className="px-6 py-3 text-muted-foreground">{o.seller}</td>
                  <td className="px-6 py-3"><Price amount={o.total} /></td>
                  <td className="px-6 py-3"><StatusBadge tone={o.status === "delivered" ? "success" : o.status === "cancelled" ? "danger" : "warning"}>{o.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.data && <Paging page={page} hasMore={query.data.hasMore} pending={query.isFetching} change={setPage} />}
    </TableShell>
  );
}

// Mirrors the server's allowed transitions; the server remains authoritative.
const TRANSITIONS: Record<CaseType, Record<string, string[]>> = {
  support: { open: ["in_progress", "resolved"], in_progress: ["open", "resolved"], resolved: ["open"] },
  vehicle_enquiry: {
    new: ["contacted", "quoted", "closed"],
    contacted: ["quoted", "closed"],
    quoted: ["contacted", "closed"],
    closed: ["contacted"],
  },
};
const STATUSES: Record<CaseType, string[]> = {
  support: ["open", "in_progress", "resolved"],
  vehicle_enquiry: ["new", "contacted", "quoted", "closed"],
};
const caseTone = (s: string) =>
  s === "resolved" || s === "closed" ? "success" : s === "open" || s === "new" ? "warning" : "info";

export function CaseQueue({ type }: { type: CaseType }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useStaffQuery<Page<SupportCase | EnquiryCase>>(["cases", type, page, status], () =>
    type === "support"
      ? operationsService.supportCases(page, status)
      : operationsService.enquiryCases(page, status),
  );
  const title = type === "support" ? "Support requests" : "Vehicle enquiries";
  return (
    <TableShell title={title}>
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Label htmlFor={`${type}-status`}>Status</Label>
        <select
          id={`${type}-status`}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); setOpenId(null); }}
        >
          <option value="all">All</option>
          {STATUSES[type].map((s) => <option key={s} value={s}>{words(s)}</option>)}
        </select>
      </div>
      {query.isError ? (
        <div className="p-4"><Failure retry={() => void query.refetch()} /></div>
      ) : !query.data ? (
        <p role="status" className="p-6 text-muted-foreground">Loading {title.toLowerCase()}…</p>
      ) : query.data.items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No {title.toLowerCase()} with this status.</p>
      ) : (
        <ul className="divide-y border-border">
          {query.data.items.map((c) => (
            <li key={c.id} className="p-4 sm:px-6">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 text-left"
                aria-expanded={openId === c.id}
                onClick={() => setOpenId(openId === c.id ? null : c.id)}
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{c.reference} · {dateLabel(c.createdAt)}</p>
                  <p className="font-medium truncate">
                    {"vehicleName" in c ? `${c.vehicleName} → ${c.destination}` : words(c.topic)} — {c.name}
                  </p>
                </div>
                <StatusBadge tone={caseTone(c.status)}>{words(c.status)}</StatusBadge>
              </button>
              {openId === c.id && <CaseDetail type={type} item={c} />}
            </li>
          ))}
        </ul>
      )}
      {query.data && <Paging page={page} hasMore={query.data.hasMore} pending={query.isFetching} change={setPage} />}
    </TableShell>
  );
}

function CaseDetail({ type, item }: { type: CaseType; item: SupportCase | EnquiryCase }) {
  const cache = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const events = useStaffQuery(["case-events", type, item.id, item.statusVersion], () =>
    operationsService.caseEvents(type, item.id),
  );
  const change = useMutation({
    mutationFn: (status: string) =>
      operationsService.changeCaseStatus(type, item.id, {
        status,
        expectedVersion: item.statusVersion,
        note: note.trim(),
      }),
    onSuccess: () => {
      setNote("");
      setError("");
    },
    onError: (err) => setError(apiErrorMessage(err, "The status could not be changed. Try again.")),
    onSettled: () => cache.invalidateQueries({ queryKey: ["operations"] }),
  });
  const submit = (status: string) => (e: FormEvent) => {
    e.preventDefault();
    change.mutate(status);
  };
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-2">
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Email</dt><dd><a className="text-primary hover:underline" href={`mailto:${item.email}`}>{item.email}</a></dd>
        {item.phone && (<><dt className="text-muted-foreground">Phone</dt><dd>{item.phone}</dd></>)}
        {"orderRef" in item && item.orderRef && (<><dt className="text-muted-foreground">Order ref</dt><dd>{item.orderRef}</dd></>)}
        {"quotedLandedPrice" in item && (<><dt className="text-muted-foreground">Estimate shown</dt><dd><Price amount={item.quotedLandedPrice} /></dd></>)}
        <dt className="text-muted-foreground">Message</dt><dd className="whitespace-pre-wrap">{item.message || "—"}</dd>
      </dl>
      <div className="space-y-4">
        <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
          <Label htmlFor={`note-${item.id}`}>Note for the case history (optional)</Label>
          <Textarea id={`note-${item.id}`} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {TRANSITIONS[type][item.status]?.map((s) => (
              <Button key={s} size="sm" variant="outline" disabled={change.isPending} onClick={submit(s)}>
                Mark {words(s)}
              </Button>
            ))}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        <div>
          <p className="text-sm font-semibold mb-2">History</p>
          {events.isError ? (
            <Failure retry={() => void events.refetch()} label="The history could not be loaded." />
          ) : !events.data ? (
            <p role="status" className="text-sm text-muted-foreground">Loading history…</p>
          ) : events.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff actions yet.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {events.data.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.actorName}</span> moved it from {words(e.fromStatus)} to {words(e.toStatus)}
                  <span className="text-muted-foreground"> · {dateLabel(e.createdAt)}</span>
                  {e.note && <p className="text-muted-foreground">“{e.note}”</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

export function VehicleCatalogueControls() {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const query = useStaffQuery(["vehicles"], operationsService.vehicles);
  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "unpublished" }) =>
      operationsService.setVehicleStatus(id, status),
    onSuccess: () => setError(""),
    onError: (err) => setError(apiErrorMessage(err, "The vehicle could not be updated. Try again.")),
    onSettled: () => {
      cache.invalidateQueries({ queryKey: ["operations"] });
      cache.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
  return (
    <TableShell title="Vehicle catalogue">
      {error && <p role="alert" className="px-6 pt-4 text-sm text-destructive">{error}</p>}
      {query.isError ? (
        <div className="p-4"><Failure retry={() => void query.refetch()} /></div>
      ) : !query.data ? (
        <p role="status" className="p-6 text-muted-foreground">Loading vehicles…</p>
      ) : query.data.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No vehicles in the catalogue.</p>
          <p className="mt-1">Import a reviewed catalogue with the import-vehicles script; vehicles arrive unpublished.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Vehicle</th>
                <th className="px-6 py-3 font-medium">Estimate</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {query.data.map((v) => (
                <tr key={v.id}>
                  <td className="px-6 py-3 font-medium">{vehicleName(v)}</td>
                  <td className="px-6 py-3"><Price amount={v.landedPrice} /></td>
                  <td className="px-6 py-3"><StatusBadge tone={v.status === "active" ? "success" : "neutral"}>{v.status === "active" ? "published" : "unpublished"}</StatusBadge></td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: v.id, status: v.status === "active" ? "unpublished" : "active" })}
                    >
                      {v.status === "active" ? "Unpublish" : "Publish"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TableShell>
  );
}

export function NotAvailable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SurfaceCard className="p-6">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </SurfaceCard>
  );
}
