import { ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  icon: ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  badge?: number;
}

export function DashboardSidebar({ heading, items }: { heading: string; items: SidebarItem[] }) {
  return (
    <aside className="w-64 border-r border-border bg-white hidden md:block">
      <div className="p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {heading}
        </h3>
        <nav className="space-y-1">
          {items.map((item, i) => {
            const content = (
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                  item.active
                    ? "bg-primary/5 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </span>
            );
            return item.href ? (
              <Link key={i} href={item.href}>
                {content}
              </Link>
            ) : (
              <div key={i}>{content}</div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
