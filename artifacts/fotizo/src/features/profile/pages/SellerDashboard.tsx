import { useState } from "react";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Package, ShoppingBag, Star, Plus, Edit2, Eye, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { useSellerProducts, useOrders } from "@/features/profile/hooks";
import { useDeleteProduct } from "@/features/marketplace/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Price } from "@/components/common/Price";
import { StatusBadge } from "@/components/common/StatusBadge";
import { chartColors, chartAxisTick, chartTooltipStyle } from "@/constants/chart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Section = "overview" | "products" | "orders";

const chartData = [
  { name: "Mon", revenue: 400 }, { name: "Tue", revenue: 300 }, { name: "Wed", revenue: 550 },
  { name: "Thu", revenue: 450 }, { name: "Fri", revenue: 700 }, { name: "Sat", revenue: 650 }, { name: "Sun", revenue: 800 },
];

export default function DashboardSeller() {
  const { data: sellerProducts = [] } = useSellerProducts();
  const { data: orders = [] } = useOrders();
  const [section, setSection] = useState<Section>("overview");
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id, title } = pendingDelete;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: "Product removed", description: `${title} is no longer listed.` });
    } catch {
      toast({ variant: "destructive", title: "Couldn't remove product", description: "Please try again." });
    } finally {
      setPendingDelete(null);
    }
  };

  const sidebar = (
    <DashboardSidebar
      heading="Seller Portal"
      items={[
        { icon: <TrendingUp className="w-4 h-4" />, label: "Dashboard", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Package className="w-4 h-4" />, label: "My Products", active: section === "products", onClick: () => setSection("products") },
        { icon: <ShoppingBag className="w-4 h-4" />, label: "Orders", active: section === "orders", onClick: () => setSection("orders") },
        { icon: <MessageSquare className="w-4 h-4" />, label: "Messages", href: "/messages" },
      ]}
    />
  );

  const ProductsTable = (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h3 className="text-lg font-bold">My Products</h3>
        <div className="hidden sm:flex gap-2">
          <Link href="/dashboard/seller/products/new"><Button size="sm" className="gap-2"><Plus className="w-4 h-4" aria-hidden="true" /> Add Product</Button></Link>
          <Link href="/dashboard/seller/services/new"><Button size="sm" variant="outline" className="gap-2"><Plus className="w-4 h-4" aria-hidden="true" /> Add Service</Button></Link>
        </div>
      </div>
      {sellerProducts.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="mt-3 font-semibold text-foreground">No products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            List your first product to start selling on Fotizo.
          </p>
          <Link href="/dashboard/seller/products/new">
            <Button className="mt-4 gap-2"><Plus className="w-4 h-4" aria-hidden="true" /> Add your first product</Button>
          </Link>
        </div>
      ) : (
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
                    <img loading="lazy" decoding="async" src={product.image} alt={product.title} className="w-10 h-10 rounded bg-muted object-contain p-1" />
                    <span className="font-medium">{product.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium"><Price amount={product.price} /></td>
                <td className="px-6 py-4">{product.stock}</td>
                <td className="px-6 py-4">{product.sales}</td>
                <td className="px-6 py-4">
                  <StatusBadge tone={product.status === "active" ? "success" : product.status === "unpublished" ? "warning" : "danger"}>
                    {product.status.replace("_", " ")}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/products/${product.id}`}><Button aria-label="View product" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></Button></Link>
                    <Link href={`/dashboard/seller/products/${product.id}/edit`}><Button aria-label="Edit product" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Button></Link>
                    <Button
                      aria-label="Remove product"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={deleteProduct.isPending && pendingDelete?.id === product.id}
                      onClick={() => setPendingDelete({ id: product.id, title: product.title })}
                    >
                      {deleteProduct.isPending && pendingDelete?.id === product.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </SurfaceCard>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="heading-page text-foreground">
            {section === "overview" ? "Seller Dashboard" : section === "products" ? "My Products" : "Orders"}
          </h1>
          <p className="text-muted-foreground mt-1">Manage your business on Fotizo.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/seller/products/new"><Button className="gap-2"><Plus className="w-4 h-4" aria-hidden="true" /> Add Product</Button></Link>
          <Link href="/dashboard/seller/services/new"><Button variant="outline" className="gap-2"><Plus className="w-4 h-4" aria-hidden="true" /> Add Service</Button></Link>
        </div>
      </div>

      {section === "overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Revenue (Month)" value="£4,280" valueClassName="text-primary"
              sub={<p className="text-xs text-green-600 mt-2 flex items-center font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +12.5% vs last month</p>} />
            <StatCard label="Active Listings" value={String(sellerProducts.length)} />
            <StatCard label="Orders to Fulfill" value={String(orders.length)} valueClassName="text-accent" />
            <StatCard label="Average Rating" value={<span className="inline-flex items-center gap-2">4.9 <Star className="w-6 h-6 fill-accent text-accent" /></span>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <SurfaceCard className="lg:col-span-2 p-6">
              <h3 className="text-lg font-bold mb-6">Revenue Overview</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={chartAxisTick} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} dx={-10} tickFormatter={(val) => `£${val}`} />
                    <RechartsTooltip cursor={{ fill: chartColors.cursor }} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="revenue" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Recent Orders</h3>
                <Button variant="link" className="p-0" onClick={() => setSection("orders")}>View All</Button>
              </div>
              <div className="space-y-4 flex-1">
                {orders.slice(0, 5).map((order) => (
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

          {ProductsTable}
        </>
      )}

      {section === "products" && ProductsTable}

      {section === "orders" && (
        <SurfaceCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Order</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{order.id}</td>
                    <td className="px-6 py-4 font-medium">{order.productTitle}</td>
                    <td className="px-6 py-4"><Price amount={order.price} /></td>
                    <td className="px-6 py-4"><StatusBadge tone="warning">Pending</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Remove product?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed from the marketplace and buyers won't see it anymore.`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        loading={deleteProduct.isPending}
        destructive
      />
    </DashboardLayout>
  );
}
