import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_USE_MOCKS, apiErrorMessage } from "@/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Price } from "@/components/common/Price";
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

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const words = (s: string) => s.replace(/_/g, " ");

function TableShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border"><h3 className="text-lg font-bold">{title}</h3></div>
      {children}
    </SurfaceCard>
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
