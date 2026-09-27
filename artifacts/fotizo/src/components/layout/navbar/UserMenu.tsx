import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  MessageSquare,
  LogOut,
  LayoutDashboard,
  UserRound,
  Settings,
  Heart,
  LifeBuoy,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { InitialsAvatar } from "@/components/common/InitialsAvatar";
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  useEffect(() => setOpen(false), [location]);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const dashboard = user ? `/dashboard/${user.role}` : "/login";
  const links = [
    { label: "My dashboard", href: dashboard, icon: LayoutDashboard },
    { label: "My profile", href: "/profile", icon: UserRound },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Wishlist", href: "/wishlist", icon: Heart },
    { label: "Account settings", href: "/settings", icon: Settings },
    { label: "Help & support", href: "/support", icon: LifeBuoy },
  ];
  async function signOut() {
    setBusy(true);
    try {
      const result = await logout();
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Could not sign out",
          description: result.error,
        });
        return;
      }
      setOpen(false);
      navigate("/");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      ref={root}
      className={`relative ${compact ? "ml-1" : "ml-2"}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={compact ? "account-panel-mobile" : "account-panel"}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {user?.avatar ? <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full border object-cover" /> : <InitialsAvatar name={user?.name} className="h-9 w-9 border text-xs" />}
        {!compact && <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div
          id={compact ? "account-panel-mobile" : "account-panel"}
          className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-white shadow-xl"
        >
          <div className="bg-primary/5 p-5">
            <p className="font-semibold truncate">{user?.name}</p>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
            <span className="mt-3 inline-block rounded-full border bg-white px-2 py-1 text-[11px] capitalize">
              {user?.role?.replaceAll("_", " ")} account
            </span>
          </div>
          <nav aria-label="Account" className="p-2">
            {links.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t p-3">
            <Link
              href={
                user?.role === "seller"
                  ? "/dashboard/seller?tab=services"
                  : "/profile"
              }
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-lg bg-primary px-3 py-3 text-sm font-medium text-white"
            >
              {user?.role === "seller"
                ? "Manage my services"
                : "Build a professional profile"}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button
              disabled={busy}
              onClick={signOut}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
