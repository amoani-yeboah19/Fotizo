// Primary in-page sections for each role's dashboard, mirroring the sidebar in
// each *Dashboard page. Used to deep-link into a section via ?tab= — e.g. so the
// mobile menu can list a logged-in user's dashboard pages instead of one generic
// "Dashboard" link. Messages is a real route and is handled separately.
export interface DashboardNavItem {
  label: string;
  tab: string;
}

export const DASHBOARD_NAV: Record<string, DashboardNavItem[]> = {
  buyer: [
    { label: "Overview", tab: "overview" },
    { label: "My Orders", tab: "orders" },
    { label: "Bookings", tab: "bookings" },
    { label: "Wishlist", tab: "wishlist" },
  ],
  seller: [
    { label: "Dashboard", tab: "overview" },
    { label: "My Products", tab: "products" },
    { label: "Orders", tab: "orders" },
    { label: "My Purchases", tab: "purchases" },
  ],
  manager: [
    { label: "Overview", tab: "overview" },
    { label: "Users", tab: "users" },
    { label: "Moderation", tab: "moderation" },
  ],
  developer: [
    { label: "Console", tab: "overview" },
    { label: "API Keys", tab: "keys" },
    { label: "Usage & Logs", tab: "usage" },
    { label: "Webhooks", tab: "webhooks" },
    { label: "Endpoints", tab: "endpoints" },
  ],
  representative: [
    { label: "Overview", tab: "overview" },
    { label: "US Sellers", tab: "sellers" },
    { label: "US Orders", tab: "orders" },
    { label: "Approvals", tab: "approvals" },
  ],
};

export function dashboardNavItems(role?: string): DashboardNavItem[] {
  return (role && DASHBOARD_NAV[role]) || [];
}

export function dashboardHref(role: string, tab: string): string {
  return `/dashboard/${role}?tab=${tab}`;
}
