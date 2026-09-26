import { useState } from "react";
import { useLocation } from "wouter";
import {
  ShoppingBag, Store, ShieldCheck, Terminal, Globe2, Factory, ArrowRight, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardNavItems } from "@/features/profile/dashboardNav";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Button } from "@/components/ui/button";

// Cover page for the shareable demo build (/demo, gated on DEMO_MODE).
//
// The dashboards sit behind DashboardLayout's auth guard, and four of the six
// roles — manager, developer and the two representatives — have no self-service
// signup. So a reviewer handed a bare URL cannot reach them. Each card here signs into the
// matching mock account and drops straight into that role's dashboard.
//
// The accounts and the password are the ones in services/mocks/fixtures.ts. They
// only exist in mock mode, which is why showing the password here is harmless:
// this build has no backend to authenticate against.
const DEMO_PASSWORD = "password";

interface DemoRole {
  role: string;
  label: string;
  person: string;
  email: string;
  icon: LucideIcon;
  blurb: string;
}

const ROLES: DemoRole[] = [
  {
    role: "buyer",
    label: "Buyer",
    person: "Alex Morgan",
    email: "buyer@fotizo.com",
    icon: ShoppingBag,
    blurb: "Order history with live delivery states, service bookings with join links, and a saved-items shelf.",
  },
  {
    role: "seller",
    label: "Seller",
    person: "Sarah Jenkins",
    email: "seller@fotizo.com",
    icon: Store,
    blurb: "Listing management with edit and remove flows, an incoming order queue, and the seller's own purchases kept separate from sales.",
  },
  {
    role: "manager",
    label: "Manager",
    person: "James Carter",
    email: "manager@fotizo.com",
    icon: ShieldCheck,
    blurb: "Platform metrics, the user directory, and a moderation queue for listings awaiting review.",
  },
  {
    role: "developer",
    label: "Developer",
    person: "Priya Sharma",
    email: "developer@fotizo.com",
    icon: Terminal,
    blurb: "API console — keys, request volume and logs, webhook subscriptions, and the published endpoint reference.",
  },
  {
    role: "representative",
    label: "US Representative",
    person: "Jordan Blake",
    email: "usa@fotizo.com",
    icon: Globe2,
    blurb: "The US-side operation: sellers in territory, orders routed through the States, and seller applications pending approval.",
  },
  {
    role: "china_representative",
    label: "China Representative",
    person: "Wei Zhang",
    email: "china@fotizo.com",
    icon: Factory,
    blurb: "The sourcing end of both storefronts: Shop departments and reorders, the Autos marque pipeline, outbound freight and the supplier network.",
  },
];

function RoleCard({
  role,
  busy,
  onEnter,
}: {
  role: DemoRole;
  busy: boolean;
  onEnter: () => void;
}) {
  const Icon = role.icon;
  const tabs = dashboardNavItems(role.role);

  return (
    <SurfaceCard className="p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold leading-tight">{role.label}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Signs in as {role.person}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground flex-1">{role.blurb}</p>

      {tabs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${role.label} dashboard sections`}>
          {tabs.map((t) => (
            <li
              key={t.tab}
              className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-1 rounded"
            >
              {t.label}
            </li>
          ))}
        </ul>
      )}

      <Button onClick={onEnter} disabled={busy} className="gap-2 w-full">
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          <>
            Open dashboard
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </SurfaceCard>
  );
}

export default function DemoLandingPage() {
  const { login, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterAs(role: DemoRole) {
    setBusy(role.role);
    setError(null);
    // Drop whatever role was being viewed before, so switching roles from this
    // page never lands on a dashboard with the previous user's session.
    const signedOut = await logout();
    if (!signedOut.success) { setBusy(null); setError(signedOut.error ?? "Could not sign out."); return; }
    const result = await login(role.email, DEMO_PASSWORD);
    setBusy(null);
    if (result.success) {
      setLocation(`/dashboard/${role.role}`);
    } else {
      setError(result.error ?? "Could not open that dashboard.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12 lg:py-16">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Fotizo · Preview build
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
            Role dashboards
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Six dashboards, one per role. Pick a role below and you'll be signed in as that
            person and taken straight to their dashboard — no account needed.
          </p>
        </header>

        <SurfaceCard className="p-4 mb-8 border-l-4 border-l-amber-500">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              This preview is for role access testing, not production data entry.
            </span>{" "}
            The live storefront is separate from the role dashboards. Use this page only to jump to
            a specific role and verify the dashboard flow before the real account and source-data
            setup is live.
          </p>
        </SurfaceCard>

        {error && (
          <div
            role="alert"
            className="mb-6 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3"
          >
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => (
            <RoleCard
              key={role.role}
              role={role}
              busy={busy === role.role}
              onEnter={() => enterAs(role)}
            />
          ))}
        </div>

        <footer className="mt-12 pt-8 border-t border-border space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-2">Signing in by hand</h2>
            <p className="text-sm text-muted-foreground mb-3">
              If you sign out and want back in, any of these work on the normal login page — the
              password is <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{DEMO_PASSWORD}</code> for
              all of them.
            </p>
            <ul className="text-sm text-muted-foreground grid gap-1 sm:grid-cols-2">
              {ROLES.map((r) => (
                <li key={r.role}>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{r.email}</code>
                  <span className="ml-2 text-xs">{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            The rest of the site is live here too — the{" "}
            <a href="/" className="text-primary underline underline-offset-4">
              storefront, shop, autos and services
            </a>{" "}
            all work, so you can see where the dashboards sit in context.
          </p>
        </footer>
      </div>
    </div>
  );
}
