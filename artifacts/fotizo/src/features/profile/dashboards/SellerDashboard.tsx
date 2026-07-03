import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Package, ShoppingBag, Star, Plus, Edit2, Eye } from "lucide-react";
import { useSellerProducts, useOrders } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";

const chartData = [
  { name: "Mon", revenue: 400 },
  { name: "Tue", revenue: 300 },
  { name: "Wed", revenue: 550 },
  { name: "Thu", revenue: 450 },
  { name: "Fri", revenue: 700 },
  { name: "Sat", revenue: 650 },
  { name: "Sun", revenue: 800 },
];

export default function DashboardSeller() {
  const { data: sellerProducts = [] } = useSellerProducts();
  const { data: orders = [] } = useOrders();

  const sidebar = (
    <DashboardSidebar
      heading="Seller Portal"
      items={[
        { icon: <TrendingUp className="w-4 h-4" />, label: "Dashboard", active: true },
        { icon: <Package className="w-4 h-4" />, label: "My Products" },
        { icon: <ShoppingBag className="w-4 h-4" />, label: "Orders" },
      ]}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Seller Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your business on Fotizo.</p>
        </div>
        <div className="flex gap-3">
          <Button className="gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
          <Button variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Add Service</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Revenue (Month)"
          value="£4,280"
          valueClassName="text-primary"
          sub={
            <p className="text-xs text-green-600 mt-2 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> +12.5% vs last month
            </p>
          }
        />
        <StatCard label="Active Listings" value="24" />
        <StatCard label="Orders to Fulfill" value="12" valueClassName="text-accent" />
        <StatCard
          label="Average Rating"
          value={
            <span className="inline-flex items-center gap-2">
              4.9 <Star className="w-6 h-6 fill-accent text-accent" />
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Chart */}
        <SurfaceCard className="lg:col-span-2 p-6">
          <h3 className="text-lg font-bold mb-6">Revenue Overview</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} dx={-10} tickFormatter={(val) => `£${val}`} />
                <RechartsTooltip cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        {/* Recent Orders */}
        <SurfaceCard className="p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Recent Orders</h3>
            <Button variant="link" className="p-0">View All</Button>
          </div>
          <div className="space-y-4 flex-1">
            {orders.map((order) => (
              <div key={order.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm truncate max-w-[150px]">{order.productTitle}</p>
                  <p className="text-xs text-muted-foreground">{order.id}</p>
                </div>
                <div className="text-right">
                  <Price amount={order.price} className="text-sm font-bold" />
                  <p className="text-xs text-accent">Pending</p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      {/* Products Table */}
      <SurfaceCard className="overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold">My Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Sales</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {sellerProducts.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt="" className="w-10 h-10 rounded bg-muted object-contain p-1" />
                      <span className="font-medium">{product.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <Price amount={product.price} />
                  </td>
                  <td className="px-6 py-4">{product.stock}</td>
                  <td className="px-6 py-4">{product.sales}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        product.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </DashboardLayout>
  );
}
