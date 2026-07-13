import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { Globe, Store, ShoppingBag, Users, ShieldAlert, TrendingUp } from "lucide-react";
import { useDashboardSection } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Price } from "@/components/common/Price";
import { chartColors, chartAxisTick, chartTooltipStyle } from "@/constants/chart";
import { Button } from "@/components/ui/button";

type Section = "overview" | "sellers" | "orders" | "approvals";

const salesData = [
  { name: "Jan", revenue: 42000 }, { name: "Feb", revenue: 51000 }, { name: "Mar", revenue: 48000 },
  { name: "Apr", revenue: 63000 }, { name: "May", revenue: 71000 }, { name: "Jun", revenue: 82000 },
];

const US_SELLERS = [
  { id: 1, name: "Brooklyn Made Co.", city: "New York, NY", listings: 42, revenue: 18400, status: "active" },
  { id: 2, name: "Golden Gate Goods", city: "San Francisco, CA", listings: 28, revenue: 12900, status: "active" },
  { id: 3, name: "Lone Star Crafts", city: "Austin, TX", listings: 15, revenue: 6300, status: "pending" },
  { id: 4, name: "Windy City Prints", city: "Chicago, IL", listings: 33, revenue: 14100, status: "active" },
  { id: 5, name: "Sunshine Studio", city: "Miami, FL", listings: 9, revenue: 2800, status: "suspended" },
];

const US_ORDERS = [
  { id: "US-10231", product: "Wireless Earbuds Pro", buyer: "Ava Thompson", total: 129, status: "delivered" },
  { id: "US-10232", product: "Brand Identity Package", buyer: "Liam Nguyen", total: 850, status: "in_transit" },
  { id: "US-10233", product: "Handmade Leather Bag", buyer: "Sofia Rossi", total: 240, status: "processing" },
  { id: "US-10234", product: "SEO Audit & Strategy", buyer: "Noah Patel", total: 460, status: "delivered" },
];

const TOP_CATEGORIES = [
  { name: "Electronics", share: 34 },
  { name: "Freelance Services", share: 27 },
  { name: "Fashion", share: 19 },
  { name: "Home & Living", share: 12 },
];

const subText = (t: string) => <p className="text-xs text-muted-foreground mt-2">{t}</p>;
const sellerTone = (s: string) => (s === "active" ? "success" : s === "pending" ? "warning" : "danger");
const orderTone = (s: string) => (s === "delivered" ? "success" : s === "in_transit" ? "info" : "warning");

function SellersTable() {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h3 className="text-lg font-bold">US Sellers</h3>
        <Button variant="outline" size="sm">Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Seller</th>
              <th className="px-6 py-4 font-medium">Location</th>
              <th className="px-6 py-4 font-medium">Listings</th>
              <th className="px-6 py-4 font-medium">Revenue</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {US_SELLERS.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-6 py-4 font-medium">{s.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{s.city}</td>
                <td className="px-6 py-4">{s.listings}</td>
                <td className="px-6 py-4"><Price amount={s.revenue} /></td>
                <td className="px-6 py-4"><StatusBadge tone={sellerTone(s.status)}>{s.status}</StatusBadge></td>
                <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm">Manage</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

function ApprovalsQueue() {
  return (
    <SurfaceCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-lg font-bold">Regional Approvals</h3>
        <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full font-bold">3</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["Lone Star Crafts — new seller", "Sunshine Studio — reinstatement", "Bay Area Bikes — listing review"].map((t, i) => (
          <div key={i} className="border border-border rounded-xl p-4">
            <p className="text-sm font-semibold mb-1">{t}</p>
            <p className="text-xs text-muted-foreground mb-3">Awaiting your review · US region</p>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs flex-1">Approve</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive hover:bg-destructive hover:text-white">Reject</Button>
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

export default function DashboardRepresentative() {
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "sellers", "orders", "approvals"],
    "overview",
  );

  const sidebar = (
    <DashboardSidebar
      heading="USA Region"
      items={[
        { icon: <Globe className="w-4 h-4" />, label: "Overview", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Store className="w-4 h-4" />, label: "US Sellers", active: section === "sellers", onClick: () => setSection("sellers") },
        { icon: <ShoppingBag className="w-4 h-4" />, label: "US Orders", active: section === "orders", onClick: () => setSection("orders") },
        { icon: <ShieldAlert className="w-4 h-4" />, label: "Approvals", active: section === "approvals", onClick: () => setSection("approvals") },
      ]}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Globe className="w-5 h-5" aria-hidden="true" /></span>
        <div>
          <h1 className="heading-page text-foreground">USA Representative</h1>
          <p className="text-muted-foreground mt-0.5">Regional performance and operations · United States 🇺🇸</p>
        </div>
      </header>

      {section === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="US Revenue (MTD)" value="$82.0k" valueClassName="text-primary"
              sub={<p className="text-xs text-green-600 mt-2 flex items-center font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +15.5% vs last month</p>} />
            <StatCard label="US Orders" value="3,410" sub={subText("This month")} />
            <StatCard label="Active US Sellers" value="1,284" sub={subText("42 pending approval")} />
            <StatCard label="US Buyers" value="18,902" icon={<Users className="w-6 h-6" />} iconClassName="bg-blue-50 text-blue-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <SurfaceCard className="lg:col-span-2 p-6">
              <h3 className="text-lg font-bold mb-6">US Revenue Trend</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="repRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={chartAxisTick} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} dx={-10} tickFormatter={(v) => `$${v / 1000}k`} />
                    <RechartsTooltip cursor={{ stroke: chartColors.grid }} contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="revenue" stroke={chartColors.primary} strokeWidth={2} fillOpacity={1} fill="url(#repRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6">
              <h3 className="text-lg font-bold mb-6">Top US Categories</h3>
              <div className="space-y-4">
                {TOP_CATEGORIES.map((c) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">{c.share}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${c.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>

          <SellersTable />
        </>
      )}

      {section === "sellers" && <SellersTable />}

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
                {US_ORDERS.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{o.id}</td>
                    <td className="px-6 py-4 font-medium">{o.product}</td>
                    <td className="px-6 py-4 text-muted-foreground">{o.buyer}</td>
                    <td className="px-6 py-4"><Price amount={o.total} /></td>
                    <td className="px-6 py-4"><StatusBadge tone={orderTone(o.status)}>{o.status.replace("_", " ")}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      {section === "approvals" && <ApprovalsQueue />}
    </DashboardLayout>
  );
}
