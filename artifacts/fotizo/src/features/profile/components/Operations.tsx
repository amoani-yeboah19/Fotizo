import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RecordImage, selectClass } from "./sourcing/utils";
import type { Vehicle } from "@/features/autos/data/vehicles";
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
import { ordersService } from "@/features/payments/services/orders.service";
import {
  operationsService,
  type CaseType,
  type Page,
  type SupportCase,
  type EnquiryCase,
} from "../services/operations.service";

// Staff panels backed by /api/operations. Every figure is read from stored
// records; nothing here is illustrative.

export function useStaffQuery<T>(
  key: readonly unknown[],
  queryFn: () => Promise<T>,
) {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["operations", user?.id, ...key],
    queryFn,
    enabled: isAuthenticated && !AUTH_USE_MOCKS,
  });
}

export function Failure({
  retry,
  label = "These records could not be loaded.",
}: {
  retry: () => void;
  label?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-border bg-white p-4 space-y-3"
    >
      <p className="text-sm">{label} Check your connection, then retry.</p>
      <Button variant="outline" size="sm" onClick={retry}>
        Retry
      </Button>
    </div>
  );
}

export function Paging({
  page,
  hasMore,
  pending,
  change,
}: {
  page: number;
  hasMore: boolean;
  pending: boolean;
  change: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center gap-4 p-4 border-t border-border"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page === 0 || pending}
        onClick={() => change(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm">Page {page + 1}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasMore || pending}
        onClick={() => change(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
const words = (s: string) => s.replace(/_/g, " ");

function TableShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      {children}
    </SurfaceCard>
  );
}

// Mirrors the server's allowed transitions; the server remains authoritative.
const TRANSITIONS: Record<CaseType, Record<string, string[]>> = {
  support: {
    open: ["in_progress", "resolved"],
    in_progress: ["open", "resolved"],
    resolved: ["open"],
  },
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
  s === "resolved" || s === "closed"
    ? "success"
    : s === "open" || s === "new"
      ? "warning"
      : "info";

export function CaseQueue({ type }: { type: CaseType }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useStaffQuery<Page<SupportCase | EnquiryCase>>(
    ["cases", type, page, status],
    () =>
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
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
            setOpenId(null);
          }}
        >
          <option value="all">All</option>
          {STATUSES[type].map((s) => (
            <option key={s} value={s}>
              {words(s)}
            </option>
          ))}
        </select>
      </div>
      {AUTH_USE_MOCKS ? (
        <p className="p-6 text-sm text-muted-foreground">
          Case management is available when signed into a live staff account.
        </p>
      ) : query.isError ? (
        <div className="p-4">
          <Failure retry={() => void query.refetch()} />
        </div>
      ) : !query.data ? (
        <p role="status" className="p-6 text-muted-foreground">
          Loading {title.toLowerCase()}…
        </p>
      ) : query.data.items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No {title.toLowerCase()} with this status.
        </p>
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
                  <p className="font-mono text-xs text-muted-foreground">
                    {c.reference} · {dateLabel(c.createdAt)}
                  </p>
                  <p className="font-medium truncate">
                    {"vehicleName" in c
                      ? `${c.vehicleName} → ${c.destination}`
                      : words(c.topic)}{" "}
                    — {c.name}
                  </p>
                </div>
                <StatusBadge tone={caseTone(c.status)}>
                  {words(c.status)}
                </StatusBadge>
              </button>
              {openId === c.id && <CaseDetail type={type} item={c} />}
            </li>
          ))}
        </ul>
      )}
      {query.data && (
        <Paging
          page={page}
          hasMore={query.data.hasMore}
          pending={query.isFetching}
          change={setPage}
        />
      )}
    </TableShell>
  );
}

function CaseDetail({
  type,
  item,
}: {
  type: CaseType;
  item: SupportCase | EnquiryCase;
}) {
  const cache = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const events = useStaffQuery(
    ["case-events", type, item.id, item.statusVersion],
    () => operationsService.caseEvents(type, item.id),
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
    onError: (err) =>
      setError(
        apiErrorMessage(err, "The status could not be changed. Try again."),
      ),
    onSettled: () => cache.invalidateQueries({ queryKey: ["operations"] }),
  });
  const submit = (status: string) => (e: FormEvent) => {
    e.preventDefault();
    change.mutate(status);
  };
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-2">
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Email</dt>
        <dd>
          <a
            className="text-primary hover:underline"
            href={`mailto:${item.email}`}
          >
            {item.email}
          </a>
        </dd>
        {item.phone && (
          <>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{item.phone}</dd>
          </>
        )}
        {"orderRef" in item && item.orderRef && (
          <>
            <dt className="text-muted-foreground">Order ref</dt>
            <dd>{item.orderRef}</dd>
          </>
        )}
        {"quotedLandedPrice" in item && (
          <>
            <dt className="text-muted-foreground">Estimate shown</dt>
            <dd>
              <Price amount={item.quotedLandedPrice} />
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Message</dt>
        <dd className="whitespace-pre-wrap">{item.message || "—"}</dd>
      </dl>
      <div className="space-y-4">
        <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
          <Label htmlFor={`note-${item.id}`}>
            Note for the case history (optional)
          </Label>
          <Textarea
            id={`note-${item.id}`}
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {TRANSITIONS[type][item.status]?.map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                disabled={change.isPending}
                onClick={submit(s)}
              >
                Mark {words(s)}
              </Button>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
        <div>
          <p className="text-sm font-semibold mb-2">History</p>
          {events.isError ? (
            <Failure
              retry={() => void events.refetch()}
              label="The history could not be loaded."
            />
          ) : !events.data ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading history…
            </p>
          ) : events.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No staff actions yet.
            </p>
          ) : (
            <ol className="space-y-2 text-sm">
              {events.data.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.actorName}</span> moved it
                  from {words(e.fromStatus)} to {words(e.toStatus)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {dateLabel(e.createdAt)}
                  </span>
                  {e.note && (
                    <p className="text-muted-foreground">“{e.note}”</p>
                  )}
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [make, setMake] = useState("all");
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [page, setPage] = useState(0);
  const query = useStaffQuery(["vehicles"], operationsService.vehicles);
  const toggle = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "active" | "unpublished";
    }) => operationsService.setVehicleStatus(id, status),
    onSuccess: () => setError(""),
    onError: (err) =>
      setError(
        apiErrorMessage(err, "The vehicle could not be updated. Try again."),
      ),
    onSettled: () => {
      cache.invalidateQueries({ queryKey: ["operations"] });
      cache.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
  const filtered = (query.data ?? []).filter(
    (v) =>
      `${v.make} ${v.model} ${v.id}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (status === "all" || v.status === status) &&
      (make === "all" || v.make === make),
  );
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  );
  return (
    <TableShell title="Vehicle catalogue">
      <div className="p-4 border-b flex flex-wrap gap-3">
        <Input
          aria-label="Search vehicles"
          placeholder="Search make, model or ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="sm:max-w-xs"
        />
        <select
          aria-label="Filter vehicle make"
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setPage(0);
          }}
          className={selectClass}
        >
          <option value="all">All makes</option>
          {[...new Set((query.data ?? []).map((v) => v.make))]
            .sort()
            .map((m) => (
              <option key={m}>{m}</option>
            ))}
        </select>
        <select
          aria-label="Filter vehicle visibility"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className={selectClass}
        >
          <option value="all">All visibility</option>
          <option value="active">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>
      </div>
      {error && (
        <p role="alert" className="px-6 pt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {AUTH_USE_MOCKS ? (
        <p className="p-6 text-sm text-muted-foreground">
          Vehicle catalogue management is available when signed into a live
          staff account.
        </p>
      ) : query.isError ? (
        <div className="p-4">
          <Failure retry={() => void query.refetch()} />
        </div>
      ) : !query.data ? (
        <p role="status" className="p-6 text-muted-foreground">
          Loading vehicles…
        </p>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            No vehicles match this view.
          </p>
          <p className="mt-1">
            Try another search or filter. New catalogue records appear here once
            added by your team.
          </p>
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
              {filtered.slice(current * 20, (current + 1) * 20).map((v) => (
                <tr key={v.id}>
                  <td className="px-6 py-3 font-medium">
                    <button
                      className="flex items-center gap-3 text-left hover:text-primary"
                      onClick={() => setSelected(v)}
                    >
                      <RecordImage src={v.image} title={vehicleName(v)} />
                      <span>{vehicleName(v)}</span>
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <Price amount={v.landedPrice} />
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      tone={v.status === "active" ? "success" : "neutral"}
                    >
                      {v.status === "active" ? "published" : "unpublished"}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelected(v)}
                      aria-label={`View ${vehicleName(v)}`}
                    >
                      View details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={toggle.isPending}
                      onClick={() =>
                        toggle.mutate({
                          id: v.id,
                          status:
                            v.status === "active" ? "unpublished" : "active",
                        })
                      }
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
      {filtered.length > 0 && (
        <Paging
          page={current}
          hasMore={(current + 1) * 20 < filtered.length}
          pending={query.isFetching}
          change={setPage}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>
            {selected ? vehicleName(selected) : "Vehicle details"}
          </DialogTitle>
          <DialogDescription>
            Catalogue specifications and estimated lead time.
          </DialogDescription>
          {selected && (
            <div className="space-y-4">
              <RecordImage
                src={selected.image}
                title={vehicleName(selected)}
                large
              />
              <p className="text-sm whitespace-pre-wrap">
                {selected.description}
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt>Estimated landed price</dt>
                <dd>
                  <Price amount={selected.landedPrice} />
                </dd>
                <dt>Powertrain</dt>
                <dd>{selected.powertrain}</dd>
                <dt>Fuel</dt>
                <dd>{selected.fuel}</dd>
                <dt>Seats</dt>
                <dd>{selected.seats}</dd>
                <dt>Transmission</dt>
                <dd>{selected.transmission}</dd>
                <dt>Lead time</dt>
                <dd>{selected.leadTimeWeeks.join("–")} weeks</dd>
              </dl>
              <p className="text-xs text-muted-foreground">
                Specification and price changes are handled by the catalogue
                team. Visibility can be changed from the vehicle list.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TableShell>
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  pay_on_delivery: "Pay on delivery",
  mobile_money: "Mobile money",
  bank_transfer: "Bank transfer",
};

/**
 * Orders grouped by checkout, for staff to arrange offline payment: contact
 * details, the chosen method, and marking the order paid once money arrives.
 */
export function OrderPayments() {
  const cache = useQueryClient();
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const query = useStaffQuery(["orders", page], () =>
    operationsService.orders(page),
  );
  const markPaid = useMutation({
    mutationFn: (orderId: string) => ordersService.markPaid(orderId),
    onSuccess: () => setError(""),
    onError: (err) =>
      setError(
        apiErrorMessage(err, "The order could not be marked paid. Try again."),
      ),
    onSettled: () => cache.invalidateQueries({ queryKey: ["operations"] }),
  });
  const orders = new Map<string, NonNullable<typeof query.data>["items"]>();
  for (const line of query.data?.items ?? [])
    orders.set(line.orderId, [...(orders.get(line.orderId) ?? []), line]);
  return (
    <TableShell title="Orders and payments">
      {error && (
        <p role="alert" className="px-6 pt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {query.isError ? (
        <div className="p-4">
          <Failure retry={() => void query.refetch()} />
        </div>
      ) : !query.data ? (
        <p role="status" className="p-6 text-muted-foreground">
          Loading orders…
        </p>
      ) : orders.size === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No orders have been placed.
        </p>
      ) : (
        <ul className="divide-y border-border">
          {[...orders.values()].map((lines) => {
            const first = lines[0];
            return (
              <li
                key={first.orderId}
                className="p-4 sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-mono text-xs text-muted-foreground">
                    {first.reference ?? first.orderId.slice(0, 8)} ·{" "}
                    {dateLabel(first.createdAt)}
                  </p>
                  <p className="font-medium">
                    {first.contactName ?? first.buyer}
                    {first.contactPhone && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {first.contactPhone}
                      </span>
                    )}
                    {first.city && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {first.city}
                        {first.country ? `, ${first.country}` : ""}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {lines
                      .map((l) => `${l.quantity}× ${l.productTitle}`)
                      .join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <Price amount={first.orderTotal} className="font-semibold" />
                  <span className="text-xs text-muted-foreground">
                    {first.paymentMethod
                      ? PAYMENT_LABELS[first.paymentMethod]
                      : "Placed before checkout records"}
                  </span>
                  {first.paymentStatus === "paid" ? (
                    <StatusBadge tone="success">paid</StatusBadge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markPaid.isPending}
                      onClick={() => markPaid.mutate(first.orderId)}
                    >
                      Mark paid
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {query.data && (
        <Paging
          page={page}
          hasMore={query.data.hasMore}
          pending={query.isFetching}
          change={setPage}
        />
      )}
    </TableShell>
  );
}
