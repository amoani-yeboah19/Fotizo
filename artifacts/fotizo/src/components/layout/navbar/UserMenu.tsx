import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { ChevronDown, MessageSquare, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { InitialsAvatar } from "@/components/common/InitialsAvatar";

// Avatar dropdown (dashboard / messages / settings / sign out). Opens on
// hover or keyboard focus on desktop, and on tap for touch screens.
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Close after navigating, on a tap elsewhere, or with Escape.
  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const dashboardLink = user ? `/dashboard/${user.role}` : "/login";
  const { toast } = useToast();
  const handleLogout = async () => {
    setOpen(false);
    const result = await logout();
    if (!result.success) { toast({ variant: "destructive", title: "Could not sign out", description: result.error }); return; }
    setLocation("/");
  };

  return (
    <div ref={box} className={`relative group ${compact ? "ml-1" : "ml-2"}`}>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {user?.avatar ? (
          <img
            loading="lazy"
            decoding="async"
            src={user.avatar}
            alt={user?.name}
            className="w-8 h-8 rounded-full border border-border object-cover"
          />
        ) : (
          <InitialsAvatar name={user?.name} className="w-8 h-8 text-xs border border-border" />
        )}
        {!compact && <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>
      <div
        className={`absolute top-full right-0 mt-2 w-52 bg-white border border-border rounded-xl shadow-xl z-50 transition-all duration-200 py-2 flex flex-col ${
          open
            ? "opacity-100 visible"
            : "opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible group-focus-within:opacity-100 group-focus-within:visible"
        }`}
      >
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
        <Link href="/settings">
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2">
            <Settings className="w-4 h-4" /> Account settings
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
