import { ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}

function Badge({ count }: { count?: number }) {
  if (count == null || count <= 0) return null;
  return (
    <span className="ml-auto bg-accent text-white text-xs px-2 py-0.5 rounded-full">{count}</span>
  );
}

// Dashboard navigation: a vertical rail on md+ and a horizontal, scrollable
// pill bar on mobile (the rail is hidden there, so without this phones would
// have no way to switch dashboard panels).
export function DashboardSidebar({ heading, items }: { heading: string; items: SidebarItem[] }) {
  const renderDesktopItem = (item: SidebarItem, i: number) => {
    const content = (
      <span
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
          item.active ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground hover:bg-muted",
        )}
      >
        {item.icon}
        <span>{item.label}</span>
        <Badge count={item.badge} />
      </span>
    );
    if (item.href) {
      return (
        <Link key={i} href={item.href}>
          {content}
        </Link>
      );
    }
    if (item.onClick) {
      return (
        <button
          key={i}
          type="button"
          onClick={item.onClick}
          aria-current={item.active ? "page" : undefined}
          className="block w-full text-left"
        >
          {content}
        </button>
      );
    }
    return <div key={i}>{content}</div>;
  };

  const mobilePillClass = (active?: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
      active ? "bg-primary text-white" : "bg-muted text-muted-foreground",
    );

  return (
    <>
      {/* ── md+ : vertical rail ── */}
      <aside className="w-64 border-r border-border bg-white hidden md:block shrink-0">
        <div className="p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {heading}
          </h3>
          <nav className="space-y-1">{items.map(renderDesktopItem)}</nav>
        </div>
      </aside>

      {/* ── < md : horizontal scrollable pill bar ── */}
      <nav
        aria-label={heading}
        className="md:hidden sticky top-20 z-30 bg-white border-b border-border overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex w-max gap-2 px-4 py-3">
          {items.map((item, i) => {
            const inner = (
              <>
                {item.icon}
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            );
            if (item.href) {
              return (
                <Link key={i} href={item.href} className={mobilePillClass(item.active)}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={i}
                type="button"
                onClick={item.onClick}
                aria-current={item.active ? "page" : undefined}
                className={mobilePillClass(item.active)}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
