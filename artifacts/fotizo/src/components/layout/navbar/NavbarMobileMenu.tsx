import { Link, useLocation } from "wouter";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { InitialsAvatar } from "@/components/common/InitialsAvatar";
import { dashboardNavItems, dashboardHref } from "@/features/profile/dashboardNav";

const linkClass =
  "block px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg cursor-pointer";

export function NavbarMobileMenu({
  onSignIn,
  onJoin,
  onClose,
}: {
  onSignIn?: () => void;
  onJoin?: () => void;
  onClose?: () => void;
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalUnread } = useMessages();
  const [, setLocation] = useLocation();

  const dashboardPages = dashboardNavItems(user?.role);
  const handleLogout = () => {
    logout();
    onClose?.();
    setLocation("/");
  };

  return (
    <div className="md:hidden border-t border-border bg-white absolute top-full left-0 w-full p-4 flex flex-col gap-4 shadow-lg h-[calc(100vh-80px)] overflow-y-auto">
      <div className="relative w-full">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          aria-label="Search"
          className="w-full pl-10 pr-4 py-3 bg-muted border border-transparent rounded-lg text-sm outline-none"
        />
      </div>
      <nav className="flex flex-col gap-2">
        <Link href="/shop" onClick={onClose}><span className="block px-4 py-3 text-sm font-semibold text-[#FF6A00] hover:bg-muted rounded-lg cursor-pointer">Shop</span></Link>
        <Link href="/products" onClick={onClose}><span className={linkClass}>Products</span></Link>
        <Link href="/services" onClick={onClose}><span className={linkClass}>Services</span></Link>
      </nav>
      <div className="h-px bg-border my-2" />

      {isAuthenticated ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            {user?.avatar ? (
              <img
                loading="lazy"
                decoding="async"
                src={user.avatar}
                alt={user?.name}
                className="w-10 h-10 rounded-full border border-border object-cover"
              />
            ) : (
              <InitialsAvatar name={user?.name} className="w-10 h-10 text-sm border border-border" />
            )}
            <div>
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>

          {/* The logged-in user's dashboard pages (deep-linked via ?tab=). */}
          {dashboardPages.length > 0 && (
            <>
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dashboard
              </p>
              {dashboardPages.map((item) => (
                <Link key={item.tab} href={dashboardHref(user!.role, item.tab)} onClick={onClose}>
                  <span className={linkClass}>{item.label}</span>
                </Link>
              ))}
              <div className="h-px bg-border my-2" />
            </>
          )}

          <Link href="/messages" onClick={onClose}>
            <span className="flex justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg cursor-pointer">
              Messages {totalUnread > 0 && <span className="bg-accent text-white px-2 py-0.5 rounded-full text-xs">{totalUnread}</span>}
            </span>
          </Link>
          <button onClick={handleLogout} className="text-left px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg">Sign Out</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-auto">
          <Button variant="outline" className="w-full justify-center" onClick={onSignIn}>Sign In</Button>
          <Button className="w-full justify-center bg-primary text-white" onClick={onJoin}>Get Started</Button>
        </div>
      )}
    </div>
  );
}
