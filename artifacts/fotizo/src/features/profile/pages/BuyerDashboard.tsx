import { PurchaseDetailsDialog, purchaseStatusTone } from "@/features/orders/components/PurchaseDetailsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useOrders, useDashboardSection } from "@/features/profile/hooks";
import { useBookings } from "@/features/bookings/hooks";
import { MyBookingCard } from "@/features/bookings/components/MyBookingCard";
import { useWishlist } from "@/features/wishlist/hooks";
import { WishlistItems } from "@/features/wishlist/components/WishlistItems";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import type { Order, Booking } from "@/types";
import { Link } from "wouter";
import {
  LayoutDashboard, Heart, MessageSquare, CreditCard, Package, Calendar,
} from "lucide-react";

type Section = "overview" | "orders" | "bookings" | "wishlist";

function OrderRow({ order }: { order: Order }) {
  return (
    <PurchaseDetailsDialog order={order}>
      <button type="button" aria-label={`View purchase details for ${order.productTitle}`} className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        <span className="flex items-center gap-4 min-w-0">
          <img loading="lazy" decoding="async" src={order.productImage} alt="" className="w-12 h-12 rounded-lg bg-muted object-contain p-1 shrink-0" />
          <span className="min-w-0">
            <span className="block font-medium text-sm line-clamp-1">{order.productTitle}</span>
            <span className="block text-xs text-muted-foreground">{order.seller} · Qty {order.quantity}</span>
            <span className="block mt-1 text-xs text-primary">View purchase</span>
          </span>
        </span>
        <span className="flex flex-col items-end shrink-0 pl-4">
          <StatusBadge tone={purchaseStatusTone(order.status)} className="mb-1">{order.status.replaceAll("_", " ")}</StatusBadge>
          <Price amount={order.price * order.quantity} className="text-sm font-bold" />
        </span>
      </button>
    </PurchaseDetailsDialog>
  );
}

// Soonest first for what's coming up; most recent first for everything else.
function splitBookings(bookings: Booking[]) {
  const now = Date.now();
  const time = (b: Booking) => new Date(b.scheduledFor).getTime();
  const isUpcoming = (b: Booking) => (b.status === "requested" || b.status === "confirmed") && time(b) >= now;
  return {
    upcoming: bookings.filter(isUpcoming).sort((a, b) => time(a) - time(b)),
    past: bookings.filter((b) => !isUpcoming(b)).sort((a, b) => time(b) - time(a)),
  };
}

function BookingsEmpty() {
  return (
    <div className="p-10 text-center">
      <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
      <p className="mt-3 font-semibold">No bookings yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Book a professional and your appointments will appear here.</p>
      <Link href="/services">
        <Button className="mt-4" size="sm">Find a professional</Button>
      </Link>
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
  const { data: wishlist = [] } = useWishlist();
  const { data: bookings = [] } = useBookings();
  const { upcoming, past } = splitBookings(bookings);
  const month = new Date().toISOString().slice(0, 7);
  const spentThisMonth = orders
    .filter((o) => o.status !== "cancelled" && o.date.startsWith(month))
    .reduce((sum, o) => sum + o.price * o.quantity, 0);
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
            <StatCard label="Bookings" value={String(upcoming.length)} icon={<Calendar className="w-6 h-6" />} iconClassName="bg-purple-50 text-purple-600" />
            <StatCard label="Wishlist" value={String(wishlist.length)} icon={<Heart className="w-6 h-6" />} iconClassName="bg-rose-50 text-rose-600" />
            <StatCard label="Spent This Month" value={<Price amount={spentThisMonth} />} icon={<CreditCard className="w-6 h-6" />} iconClassName="bg-green-50 text-green-600" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SurfaceCard className="overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold">Recent Orders</h3>
                <Button variant="ghost" size="sm" onClick={() => setSection("orders")}>View All</Button>
              </div>
              <div className="divide-y border-border">
                {orders.length ? orders.slice(0, 3).map((o) => <OrderRow key={o.id} order={o} />) : <Empty label="No orders yet." />}
              </div>
            </SurfaceCard>
            <SurfaceCard className="overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold">Upcoming Bookings</h3>
                <Button variant="ghost" size="sm" onClick={() => setSection("bookings")}>View All</Button>
              </div>
              <div className="p-6 space-y-4">
                {upcoming.length ? upcoming.slice(0, 2).map((b) => <MyBookingCard key={b.id} booking={b} compact />) : <Empty label="No upcoming bookings." />}
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

      {section === "bookings" &&
        (bookings.length ? (
          <div className="space-y-8">
            <SurfaceCard className="p-6">
              <h2 className="text-lg font-bold mb-4">
                Upcoming <span className="font-normal text-muted-foreground">({upcoming.length})</span>
              </h2>
              <div className="space-y-4">
                {upcoming.length ? upcoming.map((b) => <MyBookingCard key={b.id} booking={b} />) : <Empty label="Nothing booked ahead. Your next appointment will show here." />}
              </div>
            </SurfaceCard>
            {past.length > 0 && (
              <SurfaceCard className="p-6">
                <h2 className="text-lg font-bold mb-4">
                  Past &amp; closed <span className="font-normal text-muted-foreground">({past.length})</span>
                </h2>
                <div className="space-y-4">
                  {past.map((b) => <MyBookingCard key={b.id} booking={b} />)}
                </div>
              </SurfaceCard>
            )}
          </div>
        ) : (
          <SurfaceCard>
            <BookingsEmpty />
          </SurfaceCard>
        ))}

      {section === "wishlist" && <WishlistItems />}
    </DashboardLayout>
  );
}
