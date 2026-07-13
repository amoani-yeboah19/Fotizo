import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useOrders, useBookings, useDashboardSection } from "@/features/profile/hooks";
import { useProducts } from "@/features/marketplace/hooks";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import type { Order, Booking } from "@/types";
import {
  LayoutDashboard, Heart, MessageSquare, CreditCard, Package, Calendar, Video,
} from "lucide-react";

type Section = "overview" | "orders" | "bookings" | "wishlist";

const orderTone = (s: string) =>
  s === "delivered" ? "success" : s === "in_transit" ? "info" : "warning";

function OrderRow({ order }: { order: Order }) {
  return (
    <div className="p-6 flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <img loading="lazy" decoding="async" src={order.productImage} alt={order.productTitle} className="w-12 h-12 rounded-lg bg-muted object-contain p-1 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm line-clamp-1">{order.productTitle}</p>
          <p className="text-xs text-muted-foreground">{order.seller}</p>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 pl-4">
        <StatusBadge tone={orderTone(order.status)} className="mb-1">{order.status.replace("_", " ")}</StatusBadge>
        <Price amount={order.price} className="text-sm font-bold" />
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold">{booking.date}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{booking.time}</span>
        </div>
        <p className="font-medium text-sm">{booking.serviceTitle}</p>
        <div className="flex items-center gap-2 mt-2">
          <img loading="lazy" decoding="async" src={booking.providerAvatar} alt={booking.provider} className="w-5 h-5 rounded-full object-cover" />
          <span className="text-xs text-muted-foreground">{booking.provider}</span>
        </div>
      </div>
      {booking.meetingLink ? (
        <Button size="sm" className="gap-2 w-full sm:w-auto"><Video className="w-4 h-4" aria-hidden="true" /> Join</Button>
      ) : (
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full self-start sm:self-center">Awaiting Link</span>
      )}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="p-6 text-sm text-muted-foreground">{label}</p>;
}

const TITLES: Record<Section, string> = {
  overview: "",
  orders: "My Orders",
  bookings: "My Bookings",
  wishlist: "My Wishlist",
};
const SUBS: Record<Section, string> = {
  overview: "Here's what's happening with your account.",
  orders: "Track and manage your purchases.",
  bookings: "Your upcoming service appointments.",
  wishlist: "Products you've saved for later.",
};

export default function DashboardBuyer() {
  const { user } = useAuth();
  const { totalUnread } = useMessages();
  const { data: orders = [] } = useOrders();
  const { data: bookings = [] } = useBookings();
  const { data: products = [] } = useProducts();
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "orders", "bookings", "wishlist"],
    "overview",
  );

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Active Orders" value={String(orders.length)} icon={<Package className="w-6 h-6" />} iconClassName="bg-blue-50 text-blue-600" />
            <StatCard label="Bookings" value={String(bookings.length)} icon={<Calendar className="w-6 h-6" />} iconClassName="bg-purple-50 text-purple-600" />
            <StatCard label="Wishlist" value="8" icon={<Heart className="w-6 h-6" />} iconClassName="bg-rose-50 text-rose-600" />
            <StatCard label="Spent This Month" value="£593" icon={<CreditCard className="w-6 h-6" />} iconClassName="bg-green-50 text-green-600" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SurfaceCard className="overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold">Recent Orders</h3>
                <Button variant="ghost" size="sm" onClick={() => setSection("orders")}>View All</Button>
              </div>
              <div className="divide-y border-border">
                {orders.slice(0, 3).map((o) => <OrderRow key={o.id} order={o} />)}
              </div>
            </SurfaceCard>
            <SurfaceCard className="overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold">Upcoming Bookings</h3>
                <Button variant="ghost" size="sm" onClick={() => setSection("bookings")}>View All</Button>
              </div>
              <div className="p-6 space-y-4">
                {bookings.slice(0, 2).map((b) => <BookingCard key={b.id} booking={b} />)}
              </div>
            </SurfaceCard>
          </div>
        </>
      )}

      {section === "orders" && (
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y border-border">
            {orders.length ? orders.map((o) => <OrderRow key={o.id} order={o} />) : <Empty label="No orders yet." />}
          </div>
        </SurfaceCard>
      )}

      {section === "bookings" && (
        <SurfaceCard className="p-6">
          <div className="space-y-4">
            {bookings.length ? bookings.map((b) => <BookingCard key={b.id} booking={b} />) : <Empty label="No bookings yet." />}
          </div>
        </SurfaceCard>
      )}

      {section === "wishlist" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.slice(2, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </DashboardLayout>
  );
}
