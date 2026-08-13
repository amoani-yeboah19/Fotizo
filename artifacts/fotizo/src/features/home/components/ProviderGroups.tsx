import { Link } from "wouter";
import { ArrowRight, Laptop, Hammer, Building2, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SERVICE_GROUPS, categoriesInGroup } from "@workspace/service-taxonomy";
import { SectionHeader } from "@/components/common/SectionHeader";

// The taxonomy names icons as strings so the package stays dependency-free;
// the mapping to components lives in the UI layer.
const ICONS: Record<string, LucideIcon> = { Laptop, Hammer, Building2 };

// A few recognisable trades per group, so the card says what it means without
// the reader having to parse "artisan".
const EXAMPLES: Record<string, string[]> = {
  freelancers: ["web-development", "graphic-design", "digital-marketing", "accounting-finance"],
  artisans: ["barbering", "fashion-design", "plumbing", "electrical", "nail-tech"],
  businesses: ["catering", "event-planning", "cleaning-services", "logistics-moving"],
};

export function ProviderGroups() {
  return (
    <section className="bg-muted/40 py-20">
      <div className="container-app">
        <SectionHeader
          title="Whoever you need, they're here"
          subtitle="Fotizo covers three kinds of provider — pick the one that fits the job."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {SERVICE_GROUPS.map((group) => {
            const Icon = ICONS[group.icon] ?? LayoutGrid;
            const total = categoriesInGroup(group.id).length;
            const examples = EXAMPLES[group.id] ?? [];

            return (
              <Link key={group.id} href={`/services?group=${group.id}`}>
                <div className="group flex h-full cursor-pointer flex-col rounded-2xl border border-border bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>

                  <h3 className="mt-5 text-xl font-bold text-foreground">{group.label}</h3>
                  <p className="mt-1 text-sm font-medium text-[#FF6A00]">{group.tagline}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {group.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {examples.map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {CATEGORY_LABELS[id] ?? id}
                      </span>
                    ))}
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      +{Math.max(0, total - examples.length)} more
                    </span>
                  </div>

                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Browse {group.label}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Resolved once rather than per render — the taxonomy is a module constant.
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_GROUPS.flatMap((g) => categoriesInGroup(g.id)).map((c) => [c.id, c.label]),
);
