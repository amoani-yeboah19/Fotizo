import { useState } from "react";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import {
  Factory, Ship, Plane, Boxes, CarFront, Warehouse, TrendingUp, AlertTriangle,
} from "lucide-react";
import { useDashboardSection, useSellerProducts } from "@/features/profile/hooks";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Price } from "@/components/common/Price";
import { chartColors, chartAxisTick, chartTooltipStyle } from "@/constants/chart";
import { Button } from "@/components/ui/button";
import { DELIVERY_WINDOWS } from "@/features/support/data/channels";
import {
  MARQUE_ROWS, AUTOS_TOTAL, CHINA_MARQUE_UNITS, CHINA_MARQUE_COUNT, FUEL_MIX,
  DEPARTMENT_ROWS, SHOP_SKU_TOTAL, SHOP_DEPARTMENT_TOTAL, SHOP_RESTOCK_TOTAL, RESTOCK_QUEUE,
  SUPPLIERS, SUPPLIER_ACTIVE, SUPPLIER_FLAGGED, SHIPMENTS, UNITS_IN_TRANSIT, OUTBOUND_TREND,
} from "@/features/profile/data/chinaSourcing";

type Section = "overview" | "shop" | "autos" | "freight" | "suppliers";

const subText = (t: string) => <p className="text-xs text-muted-foreground mt-2">{t}</p>;

const supplierTone = (s: string) =>
  s === "active" ? "success" : s === "review" ? "warning" : "danger";

const shipmentTone = (s: string) =>
  s === "arrived" ? "success" : s === "in_transit" ? "info" : s === "customs" ? "warning" : "neutral";

const FUEL_LABEL: Record<string, string> = {
  petrol: "Petrol",
  hybrid: "Hybrid",
  electric: "Electric",
};

/** Horizontal share bar, reused by the department and fuel breakdowns. */
function ShareBar({ label, value, share }: { label: string; value: string; share: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}


/**
 * The listings this account actually owns in the database, straight from
 * GET /seller/products.
 *
 * Everything else on this tab is derived from the committed catalogue; this is
 * the one panel reading the real thing, which is why it is also the one that
 * can be empty. Seeded imports land as "unpublished" — hidden from shoppers,
 * visible here — so this is where you confirm a seed actually landed.
 */
const LISTING_PAGE = 100;

function SourcedListings() {
  const { data, isLoading, isError } = useSellerProducts();
  const [showAll, setShowAll] = useState(false);

  const listings = data ?? [];
  const unpublished = listings.filter((l) => l.status === "unpublished").length;
  const live = listings.length - unpublished;
  const shown = showAll ? listings : listings.slice(0, LISTING_PAGE);

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold">Sourced listings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading || isError
              ? "Owned by this account in the catalogue database"
              : `${listings.length.toLocaleString()} owned · ${live.toLocaleString()} live · ${unpublished.toLocaleString()} awaiting pricing`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <Loading label="Loading listings…" />
      ) : isError ? (
        <ErrorState label="Could not load listings for this account." />
      ) : listings.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No listings yet.</p>
          <p className="mt-1">
            Run the catalogue seed to list the shop under this account.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Stock</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {shown.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium max-w-xs truncate" title={l.title}>
                      {l.title}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{l.category}</td>
                    <td className="px-6 py-3"><Price amount={l.price} /></td>
                    <td className="px-6 py-3">{l.stock}</td>
                    <td className="px-6 py-3 text-right">
                      <StatusBadge
                        tone={l.status === "active" ? "success" : l.status === "unpublished" ? "neutral" : "warning"}
                      >
                        {l.status === "unpublished"
                          ? "Unpublished"
                          : l.status === "active"
                            ? "Live"
                            : "Out of stock"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {listings.length > LISTING_PAGE && (
            <div className="p-4 border-t border-border text-center">
              <Button variant="outline" size="sm" onClick={() => setShowAll((v: boolean) => !v)}>
                {showAll
                  ? `Show first ${LISTING_PAGE}`
                  : `Show all ${listings.length.toLocaleString()} (currently ${shown.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </SurfaceCard>
  );
}

function DepartmentsTable() {
  const topSkus = DEPARTMENT_ROWS[0]?.skus ?? 1;
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Shop departments</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {SHOP_SKU_TOTAL} live SKUs across {SHOP_DEPARTMENT_TOTAL} departments
          </p>
        </div>
        <Button variant="outline" size="sm">Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium">SKUs</th>
              <th className="px-6 py-4 font-medium">Share</th>
              <th className="px-6 py-4 font-medium">Avg price</th>
              <th className="px-6 py-4 font-medium text-right">Needs restock</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {DEPARTMENT_ROWS.map((d) => (
              <tr key={d.id} className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">{d.label}</td>
                <td className="px-6 py-4">{d.skus}</td>
                <td className="px-6 py-4 w-40">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((d.skus / topSkus) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-6 py-4"><Price amount={d.avgPrice} /></td>
                <td className="px-6 py-4 text-right">
                  {d.restock > 0 ? (
                    <StatusBadge tone="warning">{d.restock}</StatusBadge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

function MarquesTable() {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-bold">Marques in the range</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {CHINA_MARQUE_UNITS} of {AUTOS_TOTAL} models come from the {CHINA_MARQUE_COUNT} Chinese
          marques you handle — the rest are sourced through other markets.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Marque</th>
              <th className="px-6 py-4 font-medium">Models</th>
              <th className="px-6 py-4 font-medium">Sourcing</th>
              <th className="px-6 py-4 font-medium">Avg landed</th>
              <th className="px-6 py-4 font-medium text-right">Lead time</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {MARQUE_ROWS.map((m) => (
              <tr key={m.make} className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">{m.make}</td>
                <td className="px-6 py-4">{m.units}</td>
                <td className="px-6 py-4">
                  <StatusBadge tone={m.chineseMarque ? "success" : "neutral"}>
                    {m.chineseMarque ? "China desk" : "Other market"}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4"><Price amount={m.avgLandedPrice} /></td>
                <td className="px-6 py-4 text-right text-muted-foreground">
                  {m.leadTimeWeeks[0]}–{m.leadTimeWeeks[1]} wks
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

function ShipmentsTable() {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Outbound shipments</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Air {DELIVERY_WINDOWS.air} · Sea {DELIVERY_WINDOWS.sea} · Vehicles{" "}
            {DELIVERY_WINDOWS.vehicles}
          </p>
        </div>
        <Button variant="outline" size="sm">New consignment</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Ref</th>
              <th className="px-6 py-4 font-medium">Mode</th>
              <th className="px-6 py-4 font-medium">Cargo</th>
              <th className="px-6 py-4 font-medium">Destination</th>
              <th className="px-6 py-4 font-medium">Units</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">ETA</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {SHIPMENTS.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{s.id}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5">
                    {s.mode === "air" ? (
                      <Plane className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Ship className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {s.mode === "air" ? "Air" : "Sea"}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {s.scope === "autos" ? "Vehicles" : "Shop stock"}
                </td>
                <td className="px-6 py-4">{s.port}</td>
                <td className="px-6 py-4">{s.units.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <StatusBadge tone={shipmentTone(s.status)}>
                    {s.status.replace("_", " ")}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4 text-right text-muted-foreground">{s.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

function SuppliersTable() {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h3 className="text-lg font-bold">Supplier network</h3>
        <Button variant="outline" size="sm">Add supplier</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Supplier</th>
              <th className="px-6 py-4 font-medium">Location</th>
              <th className="px-6 py-4 font-medium">Supplies</th>
              <th className="px-6 py-4 font-medium">Lines</th>
              <th className="px-6 py-4 font-medium">On time</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {SUPPLIERS.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">{s.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{s.city}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {s.scope === "autos" ? "Autos" : "Shop"}
                </td>
                <td className="px-6 py-4">{s.lines}</td>
                <td className="px-6 py-4">
                  <span className={s.onTimeRate < 80 ? "text-destructive font-medium" : ""}>
                    {s.onTimeRate}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge tone={supplierTone(s.status)}>{s.status}</StatusBadge>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm">Manage</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

function RestockQueue() {
  return (
    <SurfaceCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-lg font-bold">Reorder queue</h3>
        <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full font-bold">
          {SHOP_RESTOCK_TOTAL}
        </span>
      </div>
      {RESTOCK_QUEUE.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing is running low — every listing has stock behind it.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RESTOCK_QUEUE.map((p) => (
            <div key={p.id} className="border border-border rounded-xl p-4 flex gap-3">
              <img
                loading="lazy"
                decoding="async"
                src={p.image}
                alt={p.title}
                className="w-14 h-14 rounded-lg bg-muted object-contain p-1 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold line-clamp-1">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.sold.toLocaleString()} sold · <Price amount={p.price} />
                </p>
                <Button size="sm" className="h-7 text-xs mt-2 w-full">Reorder</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}

export default function ChinaRepresentativeDashboard() {
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "shop", "autos", "freight", "suppliers"],
    "overview",
  );

  const sidebar = (
    <DashboardSidebar
      heading="China Desk"
      items={[
        { icon: <Factory className="w-4 h-4" />, label: "Overview", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Boxes className="w-4 h-4" />, label: "Shop Supply", active: section === "shop", onClick: () => setSection("shop"), badge: SHOP_RESTOCK_TOTAL },
        { icon: <CarFront className="w-4 h-4" />, label: "Autos Pipeline", active: section === "autos", onClick: () => setSection("autos") },
        { icon: <Ship className="w-4 h-4" />, label: "Freight", active: section === "freight", onClick: () => setSection("freight") },
        { icon: <Warehouse className="w-4 h-4" />, label: "Suppliers", active: section === "suppliers", onClick: () => setSection("suppliers"), badge: SUPPLIER_FLAGGED },
      ]}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-8 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Factory className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="heading-page text-foreground">China Representative</h1>
            <p className="text-muted-foreground mt-0.5">
              Live shop source of truth for Fotizo Shop and Fotizo Autos · China 🇨🇳
            </p>
          </div>
        </div>

        <Link href="/dashboard/china_representative/products/new">
          <Button className="gap-2">
            <Boxes className="w-4 h-4" aria-hidden="true" />
            Add live shop item
          </Button>
        </Link>
      </header>

      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
        This dashboard manages the live Fotizo shop catalogue and is the source-of-truth for products sold on the storefront.
      </div>

      {section === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Shop SKUs live"
              value={SHOP_SKU_TOTAL.toLocaleString()}
              valueClassName="text-primary"
              sub={subText(`Across ${SHOP_DEPARTMENT_TOTAL} departments`)}
            />
            <StatCard
              label="Vehicles in range"
              value={String(AUTOS_TOTAL)}
              sub={subText(`${CHINA_MARQUE_UNITS} on the China desk`)}
            />
            <StatCard
              label="Units in transit"
              value={UNITS_IN_TRANSIT.toLocaleString()}
              sub={
                <p className="text-xs text-green-600 mt-2 flex items-center font-medium">
                  <TrendingUp className="w-3 h-3 mr-1" /> 6 consignments moving
                </p>
              }
            />
            <StatCard
              label="Active suppliers"
              value={String(SUPPLIER_ACTIVE)}
              icon={<Factory className="w-6 h-6" />}
              iconClassName="bg-blue-50 text-blue-600"
            />
          </div>

          {SUPPLIER_FLAGGED > 0 && (
            <SurfaceCard className="p-4 mb-8 border-l-4 border-l-amber-500 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">
                  {SUPPLIER_FLAGGED} supplier{SUPPLIER_FLAGGED === 1 ? "" : "s"} need attention
                </p>
                <p className="text-sm text-muted-foreground">
                  One is under review and one is suspended for on-time delivery below target.{" "}
                  <button
                    type="button"
                    onClick={() => setSection("suppliers")}
                    className="text-primary underline underline-offset-4"
                  >
                    Review the network
                  </button>
                </p>
              </div>
            </SurfaceCard>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <SurfaceCard className="lg:col-span-2 p-6">
              <h3 className="text-lg font-bold mb-6">Outbound units</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={OUTBOUND_TREND}>
                    <defs>
                      <linearGradient id="cnOutbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={chartAxisTick} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} dx={-10} tickFormatter={(v) => `${v / 1000}k`} />
                    <RechartsTooltip cursor={{ stroke: chartColors.grid }} contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="units" stroke={chartColors.primary} strokeWidth={2} fillOpacity={1} fill="url(#cnOutbound)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6">
              <h3 className="text-lg font-bold mb-6">Biggest departments</h3>
              <div className="space-y-4">
                {DEPARTMENT_ROWS.slice(0, 5).map((d) => (
                  <ShareBar
                    key={d.id}
                    label={d.label}
                    value={`${d.skus} SKUs`}
                    share={Math.round((d.skus / (DEPARTMENT_ROWS[0]?.skus || 1)) * 100)}
                  />
                ))}
              </div>
            </SurfaceCard>
          </div>

          <ShipmentsTable />
        </>
      )}

      {section === "shop" && (
        <div className="space-y-8">
          <SourcedListings />
          <DepartmentsTable />
          <RestockQueue />
        </div>
      )}

      {section === "autos" && (
        <div className="space-y-8">
          <MarquesTable />
          <SurfaceCard className="p-6">
            <h3 className="text-lg font-bold mb-6">Powertrain mix</h3>
            <div className="space-y-4">
              {FUEL_MIX.map((f) => (
                <ShareBar
                  key={f.fuel}
                  label={FUEL_LABEL[f.fuel] ?? f.fuel}
                  value={`${f.units} of ${AUTOS_TOTAL} · ${f.share}%`}
                  share={f.share}
                />
              ))}
            </div>
          </SurfaceCard>
        </div>
      )}

      {section === "freight" && <ShipmentsTable />}

      {section === "suppliers" && <SuppliersTable />}
    </DashboardLayout>
  );
}
