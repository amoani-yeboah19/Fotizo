import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { mockOrders, mockBookings, products } from "@/data/mockData";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, MessageSquare, CreditCard, Package, Calendar, Video } from "lucide-react";

export default function DashboardBuyer() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { totalUnread } = useMessages();

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="flex-1 flex pt-20">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-white hidden md:block">
          <div className="p-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Buyer Menu</h3>
            <nav className="space-y-1">
              <Link href="/dashboard/buyer">
                <span className="flex items-center gap-3 px-3 py-2.5 bg-primary/5 text-primary font-medium rounded-lg cursor-pointer">
                  <LayoutDashboardIcon className="w-4 h-4" /> Overview
                </span>
              </Link>
              <span className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors">
                <Package className="w-4 h-4" /> My Orders
              </span>
              <span className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors">
                <Calendar className="w-4 h-4" /> Bookings
              </span>
              <span className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors">
                <Heart className="w-4 h-4" /> Wishlist
              </span>
              <Link href="/messages">
                <span className="flex items-center justify-between px-3 py-2.5 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer transition-colors">
                  <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4" /> Messages</div>
                  {totalUnread > 0 && <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">{totalUnread}</span>}
                </span>
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name.split(' ')[0]}</h1>
              <p className="text-muted-foreground mt-1">Here's what's happening with your account.</p>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                    <h4 className="text-2xl font-bold">3</h4>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bookings</p>
                    <h4 className="text-2xl font-bold">2</h4>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Wishlist</p>
                    <h4 className="text-2xl font-bold">8</h4>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Spent This Month</p>
                    <h4 className="text-2xl font-bold">£593</h4>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Orders */}
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="text-lg font-bold">Recent Orders</h3>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
                <div className="divide-y border-border">
                  {mockOrders.map(order => (
                    <div key={order.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img src={order.productImage} alt="" className="w-12 h-12 rounded-lg bg-muted object-contain p-1" />
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{order.productTitle}</p>
                          <p className="text-xs text-muted-foreground">{order.seller}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mb-1 ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-bold">£{order.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bookings */}
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="text-lg font-bold">Upcoming Bookings</h3>
                </div>
                <div className="p-6 space-y-4">
                  {mockBookings.map(booking => (
                    <div key={booking.id} className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{booking.date}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{booking.time}</span>
                        </div>
                        <p className="font-medium text-sm">{booking.serviceTitle}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <img src={booking.providerAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
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
              </div>
            </div>

            {/* Wishlist */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">From Your Wishlist</h3>
                <Link href="/products"><Button variant="outline">Browse More</Button></Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.slice(2, 5).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

// Icon helper
function LayoutDashboardIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}
