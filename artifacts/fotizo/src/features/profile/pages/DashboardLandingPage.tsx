import { Redirect, Link } from "wouter";
import {
  ShoppingBag,
  Store,
  ShieldCheck,
  Terminal,
  Globe2,
  Factory,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardNavItems } from "@/features/profile/dashboardNav";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Button } from "@/components/ui/button";

interface DashboardOption {
  role: string;
  label: string;
  person: string;
  href: string;
  icon: LucideIcon;
  blurb: string;
}

const DASHBOARD_OPTIONS: DashboardOption[] = [
  {
    role: "buyer",
    label: "Buyer",
    person: "Alex Morgan",
    href: "/dashboard/buyer",
    icon: ShoppingBag,
    blurb: "Order history, delivery tracking, bookings and saved items.",
  },
  {
    role: "seller",
    label: "Seller",
    person: "Sarah Jenkins",
    href: "/dashboard/seller",
    icon: Store,
    blurb: "Listings, orders, purchases and seller operations in one place.",
  },
  {
    role: "manager",
    label: "Manager",
    person: "James Carter",
    href: "/dashboard/manager",
    icon: ShieldCheck,
    blurb: "Platform metrics, users and moderation for the network.",
  },
  {
    role: "developer",
    label: "Developer",
    person: "Priya Sharma",
    href: "/dashboard/developer",
    icon: Terminal,
    blurb: "API keys, usage, logs and webhook configuration.",
  },
  {
    role: "representative",
    label: "US Representative",
    person: "Jordan Blake",
    href: "/dashboard/representative",
    icon: Globe2,
    blurb: "Territory performance, US sellers and approval queues.",
  },
  {
    role: "china_representative",
    label: "China Representative",
    person: "Wei Zhang",
    href: "/dashboard/china_representative",
    icon: Factory,
    blurb: "Supply ops, autos pipeline, freight and supplier coverage.",
  },
];

export default function DashboardLandingPage() {
  const { user } = useAuth();

  if (user) {
    return <Redirect to={`/dashboard/${user.role}`} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12 lg:py-16">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Fotizo · Dashboards
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
            Role dashboards
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Choose the role you want to open. Each dashboard has its own section set and path,
            and the links below take you directly there.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_OPTIONS.map((dashboard) => {
            const Icon = dashboard.icon;
            const tabs = dashboardNavItems(dashboard.role);

            return (
              <SurfaceCard key={dashboard.href} className="p-6 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold leading-tight">{dashboard.label}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{dashboard.person}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground flex-1">{dashboard.blurb}</p>

                {tabs.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label={`${dashboard.label} dashboard sections`}>
                    {tabs.slice(0, 3).map((tab) => (
                      <li
                        key={`${dashboard.role}-${tab.tab}`}
                        className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-1 rounded"
                      >
                        {tab.label}
                      </li>
                    ))}
                  </ul>
                )}

                <Link href={dashboard.href}>
                  <Button className="gap-2 w-full">
                    Open dashboard
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
              </SurfaceCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
