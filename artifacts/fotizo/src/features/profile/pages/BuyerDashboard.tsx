import { useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useOrders, useDashboardSection } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types";
import {
  LayoutDashboard, Heart, MessageSquare, CreditCard, Package, Calendar,
} from "lucide-react";

type Section = "overview" | "orders" | "bookings" | "wishlist";

const orderTone = (s: string) =>
  s === "delivered" ? "success" : s === "cancelled" ? "danger" : s === "shipped" ? "info" : "warning";
const ACTIVE_STATUSES = new Set(["pending", "processing", "shipped"]);

function OrderRow({ order }: { order: Order }) {
  return (
    <div className="p-6 flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <img loading="lazy" decoding="async" src={order.productImage} alt={order.productTitle} className="w-12 h-12 rounded-lg bg-muted object-contain p-1 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm line-clamp-1">{order.productTitle}</p>
          <p className="text-xs text-muted-foreground">{order.seller} · {order.date} · ×{order.quantity}</p>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 pl-4">
        <StatusBadge tone={orderTone(order.status)} className="mb-1">{order.status.replace("_", " ")}</StatusBadge>
        <Price amount={order.price * order.quantity} className="text-sm font-bold" />
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="p-6 text-sm text-muted-foreground">{label}</p>;
}

// Bookings and wishlists are not stored yet; say so rather than showing samples.
function BookingsUnavailable() {
  return (
    <SurfaceCard className="p-6">
      <p className="font-semibold">Online booking isn't available yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Agree dates and prices with providers in Messages. Bookings will appear here once
        scheduling and payment are enabled.
      </p>
      <Link href="/messages"><Button variant="outline" size="sm" className="mt-4">Open messages</Button></Link>
    </SurfaceCard>
  );
}

const TITLES: Record<Section, string> = {
  overview: "",
  orders: "My Orders",
  bookings: "My Bookings",
  wishlist: "My Wishlist",
};
const SUBS: Record<Section, string> = {
  overview: "Here's what's happening with your account.",
  orders: "Track your purchases.",
  bookings: "Your service appointments.",
  wishlist: "Products you've saved for later.",
};

export default function DashboardBuyer() {
  const { user } = useAuth();
  const { totalUnread } = useMessages();
  const { data: orders = [], isError: ordersFailed } = useOrders();
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "orders", "bookings", "wishlist"],
    "overview",
  );
  const summary = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return {
      active: orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length,
      monthValue: orders
        .filter((o) => o.status !== "cancelled" && o.date.startsWith(month))
        .reduce((sum, o) => sum + o.price * o.quantity, 0),
    };
  }, [orders]);

  const sidebar = (
    <DashboardSidebar
      heading="Buyer Menu"
      items={[
        { icon: <LayoutDashboard className="w-4 h-4" />, label: "Overview", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Package className="w-4 h-4" />, label: "My Orders", active: section === "orders", onClick: () => setSection("orders") },
        { icon: <Calendar className="w-4 h-4" />, label: "Bookings", active: section === "bookings", onClick: () => setSection("bookings") },
        { icon: <Heart className="w-4 h-4" />, label: "Wishlist", active: section === "wishlist", onClick: () => setSection("wishlist") },
        { icon: <MessageSquare className="w-4 h-4" />, label: "Messages", href: "/messages", badge: totalUnread },
      ]}
    />
  );

  const orderList = (rows: Order[]) =>
    ordersFailed ? (
      <p role="alert" className="p-6 text-sm text-destructive">Your orders could not be loaded. Refresh to try again.</p>
    ) : rows.length ? (
      rows.map((o) => <OrderRow key={o.id} order={o} />)
    ) : (
      <Empty label="No orders yet." />
    );

  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-8">
        <h1 className="heading-page text-foreground">
          {section === "overview" ? `Welcome back, ${user?.name?.split(" ")[0]}` : TITLES[section]}
        </h1>
        <p className="text-muted-foreground mt-1">{SUBS[section]}</p>
      </header>

      {section === "overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Active Orders" value={String(summary.active)} icon={<Package className="w-6 h-6" />} iconClassName="bg-blue-50 text-blue-600" />
            <StatCard label="Unread Messages" value={String(totalUnread)} icon={<MessageSquare className="w-6 h-6" />} iconClassName="bg-purple-50 text-purple-600" />
            <StatCard label="Ordered This Month" value={<Price amount={summary.monthValue} />} icon={<CreditCard className="w-6 h-6" />} iconClassName="bg-green-50 text-green-600" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SurfaceCard className="overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold">Recent Orders</h3>
                <Button variant="ghost" size="sm" onClick={() => setSection("orders")}>View All</Button>
              </div>
              <div className="divide-y border-border">{orderList(orders.slice(0, 3))}</div>
            </SurfaceCard>
            <BookingsUnavailable />
          </div>
        </>
      )}

      {section === "orders" && (
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y border-border">{orderList(orders)}</div>
        </SurfaceCard>
      )}

      {section === "bookings" && <BookingsUnavailable />}

      {section === "wishlist" && (
        <SurfaceCard className="p-6">
          <p className="font-semibold">Wishlist isn't available yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Saving products to your account is coming. Until then, browse the marketplace and
            message sellers about items you like.
          </p>
          <Link href="/products"><Button variant="outline" size="sm" className="mt-4">Browse marketplace</Button></Link>
        </SurfaceCard>
      )}
    </DashboardLayout>
  );
}
