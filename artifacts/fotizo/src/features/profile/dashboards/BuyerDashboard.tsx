import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useOrders, useBookings } from "@/features/profile/hooks";
import { useProducts } from "@/features/marketplace/hooks";
import { ProductCard } from "@/components/common/ProductCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Heart,
  MessageSquare,
  CreditCard,
  Package,
  Calendar,
  Video,
} from "lucide-react";

export default function DashboardBuyer() {
  const { user } = useAuth();
  const { totalUnread } = useMessages();
  const { data: orders = [] } = useOrders();
  const { data: bookings = [] } = useBookings();
  const { data: products = [] } = useProducts();

  const sidebar = (
    <DashboardSidebar
      heading="Buyer Menu"
      items={[
        { icon: <LayoutDashboard className="w-4 h-4" />, label: "Overview", href: "/dashboard/buyer", active: true },
        { icon: <Package className="w-4 h-4" />, label: "My Orders" },
        { icon: <Calendar className="w-4 h-4" />, label: "Bookings" },
        { icon: <Heart className="w-4 h-4" />, label: "Wishlist" },
        { icon: <MessageSquare className="w-4 h-4" />, label: "Messages", href: "/messages", badge: totalUnread },
      ]}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-8">
        <h1 className="heading-page text-foreground">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your account.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Orders" value="3" icon={<Package className="w-6 h-6" />} iconClassName="bg-blue-50 text-blue-600" />
        <StatCard label="Bookings" value="2" icon={<Calendar className="w-6 h-6" />} iconClassName="bg-purple-50 text-purple-600" />
        <StatCard label="Wishlist" value="8" icon={<Heart className="w-6 h-6" />} iconClassName="bg-rose-50 text-rose-600" />
        <StatCard label="Spent This Month" value="£593" icon={<CreditCard className="w-6 h-6" />} iconClassName="bg-green-50 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Orders */}
        <SurfaceCard className="overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold">Recent Orders</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <div className="divide-y border-border">
            {orders.map((order) => (
              <div key={order.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img loading="lazy" decoding="async" src={order.productImage} alt="" className="w-12 h-12 rounded-lg bg-muted object-contain p-1" />
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{order.productTitle}</p>
                    <p className="text-xs text-muted-foreground">{order.seller}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-4">
                  <StatusBadge
                    tone={
                      order.status === "delivered"
                        ? "success"
                        : order.status === "in_transit"
                          ? "info"
                          : "warning"
                    }
                    className="mb-1"
                  >
                    {order.status.replace("_", " ")}
                  </StatusBadge>
                  <Price amount={order.price} className="text-sm font-bold" />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Bookings */}
        <SurfaceCard className="overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold">Upcoming Bookings</h3>
          </div>
          <div className="p-6 space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{booking.date}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{booking.time}</span>
                  </div>
                  <p className="font-medium text-sm">{booking.serviceTitle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <img loading="lazy" decoding="async" src={booking.providerAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                    <span className="text-xs text-muted-foreground">{booking.provider}</span>
                  </div>
                </div>
                {booking.meetingLink ? (
                  <Button size="sm" className="gap-2 w-full sm:w-auto">
                    <Video className="w-4 h-4" /> Join
                  </Button>
                ) : (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full self-start sm:self-center">
                    Awaiting Link
                  </span>
                )}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      {/* Wishlist */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">From Your Wishlist</h3>
          <Link href="/products">
            <Button variant="outline">Browse More</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.slice(2, 5).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
