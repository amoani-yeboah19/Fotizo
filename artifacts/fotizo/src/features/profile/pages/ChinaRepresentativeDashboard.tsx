import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Factory, Ship, Boxes, CarFront, Warehouse, Edit2 } from "lucide-react";
import { AUTH_USE_MOCKS } from "@/api";
import { useDashboardSection, useSellerProducts } from "@/features/profile/hooks";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import type { SellerProduct } from "@/types";
import {
  OperationsOverviewPanel,
  CaseQueue,
  VehicleCatalogueControls,
  NotAvailable,
} from "../components/Operations";

type Section = "overview" | "shop" | "autos" | "freight" | "suppliers";

// Listings at or below this stock level appear in the reorder queue.
const LOW_STOCK = 5;
const LISTING_PAGE = 100;

/** Horizontal share bar for the department breakdown. */
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

/** The listings this account owns, from GET /seller/products. */
function SourcedListings({ listings }: { listings: SellerProduct[] }) {
  const [showAll, setShowAll] = useState(false);
  const unpublished = listings.filter((l) => l.status === "unpublished").length;
  const live = listings.length - unpublished;
  const shown = showAll ? listings : listings.slice(0, LISTING_PAGE);

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-bold">Shop listings</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {`${listings.length.toLocaleString()} owned · ${live.toLocaleString()} live · ${unpublished.toLocaleString()} unpublished`}
        </p>
      </div>
      {listings.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No listings yet.</p>
          <p className="mt-1">Add a shop item, or run the reviewed catalogue import for this account.</p>
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
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {shown.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium max-w-xs truncate" title={l.title}>{l.title}</td>
                    <td className="px-6 py-3 text-muted-foreground">{l.category}</td>
                    <td className="px-6 py-3"><Price amount={l.price} /></td>
                    <td className="px-6 py-3">{l.stock}</td>
                    <td className="px-6 py-3">
                      <StatusBadge tone={l.status === "active" ? "success" : "neutral"}>
                        {l.status === "active" ? "Live" : "Unpublished"}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/dashboard/china_representative/products/${l.id}/edit`}>
                        <Button aria-label={`Edit ${l.title}`} variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {listings.length > LISTING_PAGE && (
            <div className="p-4 border-t border-border text-center">
              <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? `Show first ${LISTING_PAGE}` : `Show all ${listings.length.toLocaleString()}`}
              </Button>
            </div>
          )}
        </>
      )}
    </SurfaceCard>
  );
}

function Departments({ listings }: { listings: SellerProduct[] }) {
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) if (l.status === "active") counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [listings]);
  const top = rows[0]?.[1] ?? 1;
  return (
    <SurfaceCard className="p-6">
      <h3 className="text-lg font-bold mb-1">Departments</h3>
      <p className="text-xs text-muted-foreground mb-6">Live listings by department</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No live listings.</p>
      ) : (
        <div className="space-y-4">
          {rows.map(([category, count]) => (
            <ShareBar key={category} label={category} value={String(count)} share={(count / top) * 100} />
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}

function ReorderQueue({ listings }: { listings: SellerProduct[] }) {
  const low = listings.filter((l) => l.status === "active" && l.stock <= LOW_STOCK).sort((a, b) => a.stock - b.stock);
  return (
    <SurfaceCard className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-lg font-bold">Low stock</h3>
        <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full font-bold">{low.length}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">Live listings with {LOW_STOCK} or fewer units</p>
      {low.length === 0 ? (
        <p className="text-sm text-muted-foreground">No live listing is at or below {LOW_STOCK} units.</p>
      ) : (
        <ul className="divide-y border-border">
          {low.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm font-medium truncate">{l.title}</span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-muted-foreground">{l.stock} left</span>
                <Link href={`/dashboard/china_representative/products/${l.id}/edit`}>
                  <Button size="sm" variant="outline">Update stock</Button>
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}

export default function ChinaRepresentativeDashboard() {
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "shop", "autos", "freight", "suppliers"],
    "overview",
  );
  const listingsQuery = useSellerProducts();
  const listings = listingsQuery.data ?? [];
  const lowCount = listings.filter((l) => l.status === "active" && l.stock <= LOW_STOCK).length;

  const sidebar = (
    <DashboardSidebar
      heading="China Desk"
      items={[
        { icon: <Factory className="w-4 h-4" />, label: "Overview", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Boxes className="w-4 h-4" />, label: "Shop Supply", active: section === "shop", onClick: () => setSection("shop"), badge: lowCount },
        { icon: <CarFront className="w-4 h-4" />, label: "Autos", active: section === "autos", onClick: () => setSection("autos") },
        { icon: <Ship className="w-4 h-4" />, label: "Freight", active: section === "freight", onClick: () => setSection("freight") },
        { icon: <Warehouse className="w-4 h-4" />, label: "Suppliers", active: section === "suppliers", onClick: () => setSection("suppliers") },
      ]}
    />
  );

  const shopPanels = listingsQuery.isLoading ? (
    <Loading label="Loading listings…" />
  ) : listingsQuery.isError ? (
    <ErrorState label="Could not load listings for this account." />
  ) : null;

  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-8 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Factory className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="heading-page text-foreground">China Representative</h1>
            <p className="text-muted-foreground mt-0.5">Fotizo Shop supply and Fotizo Autos</p>
          </div>
        </div>
        <Link href="/dashboard/china_representative/products/new">
          <Button className="gap-2">
            <Boxes className="w-4 h-4" aria-hidden="true" />
            Add shop item
          </Button>
        </Link>
      </header>

      {section === "overview" && (
        <div className="space-y-8">
          {AUTH_USE_MOCKS ? (
            <p role="status">Operational reporting is unavailable in demo mode.</p>
          ) : (
            <OperationsOverviewPanel focus="sourcing" />
          )}
          {shopPanels ?? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Departments listings={listings} />
              <ReorderQueue listings={listings} />
            </div>
          )}
        </div>
      )}

      {section === "shop" && (
        shopPanels ?? (
          <div className="space-y-8">
            <ReorderQueue listings={listings} />
            <SourcedListings listings={listings} />
          </div>
        )
      )}

      {section === "autos" && (
        <div className="space-y-8">
          <CaseQueue type="vehicle_enquiry" />
          <VehicleCatalogueControls />
        </div>
      )}

      {section === "freight" && (
        <NotAvailable title="Freight tracking is not available yet">
          Shipments and containers are not recorded in the system yet. This section will show
          real consignments once the sourcing and shipping workflow is built.
        </NotAvailable>
      )}

      {section === "suppliers" && (
        <NotAvailable title="Supplier records are not available yet">
          Suppliers, purchase orders and stock receipts are not recorded in the system yet. They
          arrive with the sourcing workflow.
        </NotAvailable>
      )}
    </DashboardLayout>
  );
}
