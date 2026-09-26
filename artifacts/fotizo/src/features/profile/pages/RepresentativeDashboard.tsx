import { RegionalSellers } from "../components/sourcing/RegionalSellers";
import { useState } from "react";
import { Paging, Failure } from "../components/Operations";
import { AUTH_USE_MOCKS } from "@/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Globe,
  Store,
  ShoppingBag,
  Users,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { useDashboardSection } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Price } from "@/components/common/Price";
import {
  chartColors,
  chartAxisTick,
  chartTooltipStyle,
} from "@/constants/chart";
import { useStaffQuery } from "@/features/profile/components/Operations";
import {
  operationsService,
} from "@/features/profile/services/operations.service";

type Section = "overview" | "sellers" | "orders" | "approvals";

// Figures come from /api/operations (stored records). Accounts and orders do
// not record a region yet, so these cover every Fotizo account and order.
const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });

const subText = (t: string) => (
  <p className="text-xs text-muted-foreground mt-2">{t}</p>
);
const orderTone = (s: string) =>
  s === "delivered" ? "success" : s === "in_transit" ? "info" : "warning";

function ApprovalsQueue() {
  return (
    <SurfaceCard className="p-6">
      <h3 className="text-lg font-bold mb-3">Approvals</h3>
      <p className="text-sm text-muted-foreground">
        Regional approval processing is not available yet. Contact a manager for
        account or listing reviews.
      </p>
    </SurfaceCard>
  );
}

export default function DashboardRepresentative() {
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "sellers", "orders", "approvals"],
    "overview",
  );
  const overview = useStaffQuery(["overview"], operationsService.overview).data;
  const [orderPage, setOrderPage] = useState(0);
  const orderQuery = useStaffQuery(["orders", orderPage], () =>
    operationsService.orders(orderPage),
  );
  const orders = orderQuery.data?.items ?? [];
  const monthly = overview?.orders.monthly ?? [];
  const salesData = monthly.map((m) => ({
    name: monthLabel(m.month),
    revenue: m.value,
  }));
  const [previous, current] = monthly.slice(-2).map((m) => m.value);
  const change = previous ? ((current - previous) / previous) * 100 : null;
  const listed = overview?.listings.marketplace || 1;
  const TOP_CATEGORIES = (overview?.topCategories ?? []).map((c) => ({
    name: c.category,
    share: Math.round((c.listings / listed) * 100),
  }));

  const sidebar = (
    <DashboardSidebar
      heading="USA Region"
      items={[
        {
          icon: <Globe className="w-4 h-4" />,
          label: "Overview",
          active: section === "overview",
          onClick: () => setSection("overview"),
        },
        {
          icon: <Store className="w-4 h-4" />,
          label: "Sellers",
          active: section === "sellers",
          onClick: () => setSection("sellers"),
        },
        {
          icon: <ShoppingBag className="w-4 h-4" />,
          label: "Orders",
          active: section === "orders",
          onClick: () => setSection("orders"),
        },
        {
          icon: <ShieldAlert className="w-4 h-4" />,
          label: "Approvals",
          active: section === "approvals",
          onClick: () => setSection("approvals"),
        },
      ]}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Globe className="w-5 h-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="heading-page text-foreground">USA Representative</h1>
          <p className="text-muted-foreground mt-0.5">
            USA desk · Account and order figures currently cover all regions
          </p>
        </div>
      </header>

      {section === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Revenue (MTD)"
              value={
                overview ? (
                  <Price amount={overview.orders.valueThisMonth} />
                ) : (
                  "—"
                )
              }
              valueClassName="text-primary"
              sub={
                <p className="text-xs text-green-600 mt-2 flex items-center font-medium">
                  <TrendingUp className="w-3 h-3 mr-1" />{" "}
                  {change === null
                    ? "No orders last month"
                    : `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs last month`}
                </p>
              }
            />
            <StatCard
              label="Orders"
              value={
                overview ? overview.orders.linesThisMonth.toLocaleString() : "—"
              }
              sub={subText("This month")}
            />
            <StatCard
              label="Seller accounts"
              value={overview ? overview.users.sellers.toLocaleString() : "—"}
              sub={subText("Across all regions")}
            />
            <StatCard
              label="Buyers"
              value={overview ? overview.users.buyers.toLocaleString() : "—"}
              icon={<Users className="w-6 h-6" />}
              iconClassName="bg-blue-50 text-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <SurfaceCard className="lg:col-span-2 p-6">
              <h3 className="text-lg font-bold mb-6">Revenue Trend</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="repRev" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={chartColors.primary}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={chartColors.primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={chartColors.grid}
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={chartAxisTick}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={chartAxisTick}
                      dx={-10}
                      tickFormatter={(v) => `£${v / 1000}k`}
                    />
                    <RechartsTooltip
                      cursor={{ stroke: chartColors.grid }}
                      contentStyle={chartTooltipStyle}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={chartColors.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#repRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6">
              <h3 className="text-lg font-bold mb-6">Top categories</h3>
              <div className="space-y-4">
                {TOP_CATEGORIES.map((c) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">{c.share}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${c.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>

          <RegionalSellers />
        </>
      )}

      {section === "sellers" && <RegionalSellers />}

      {section === "orders" && (
        <SurfaceCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Order</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Buyer</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {(AUTH_USE_MOCKS ||
                  orderQuery.isLoading ||
                  orderQuery.isError) && (
                  <tr>
                    <td colSpan={5} className="p-6">
                      {AUTH_USE_MOCKS ? (
                        "Orders are available with a live staff account."
                      ) : orderQuery.isError ? (
                        <Failure retry={() => void orderQuery.refetch()} />
                      ) : (
                        "Loading orders…"
                      )}
                    </td>
                  </tr>
                )}
                {!AUTH_USE_MOCKS &&
                  !orderQuery.isLoading &&
                  !orderQuery.isError &&
                  orders.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-muted-foreground"
                      >
                        No orders yet.
                      </td>
                    </tr>
                  )}
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {o.orderId.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-medium">{o.productTitle}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {o.buyer}
                    </td>
                    <td className="px-6 py-4">
                      <Price amount={o.total} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge tone={orderTone(o.status)}>
                        {o.status.replace("_", " ")}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orderQuery.data && (
            <Paging
              page={orderPage}
              hasMore={orderQuery.data.hasMore}
              pending={orderQuery.isFetching}
              change={setOrderPage}
            />
          )}
        </SurfaceCard>
      )}

      {section === "approvals" && <ApprovalsQueue />}
    </DashboardLayout>
  );
}
