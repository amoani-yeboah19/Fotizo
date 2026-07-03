import { Link, useLocation } from "wouter";
import { ChevronDown, MessageSquare, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Desktop avatar dropdown (dashboard / messages / sign out).
export function UserMenu() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const dashboardLink = user ? `/dashboard/${user.role}` : "/login";
  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="relative group ml-2">
      <button className="flex items-center gap-2 focus:outline-none">
        <img
          loading="lazy"
          decoding="async"
          src={user?.avatar || "/images/avatar-1.webp"}
          alt={user?.name}
          className="w-8 h-8 rounded-full border border-border object-cover"
        />
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 flex flex-col">
        <div className="px-4 py-2 border-b border-border mb-2">
          <p className="text-sm font-semibold truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
        </div>
        <Link href={dashboardLink}>
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
        </Link>
        <Link href="/messages">
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Messages
          </button>
        </Link>
        <div className="h-px bg-border my-2" />
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
