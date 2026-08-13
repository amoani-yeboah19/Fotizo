import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import {
  SERVICE_GROUPS,
  serviceCategoryLabel,
  serviceGroupLabel,
  isServiceCategoryId,
  groupForCategory,
  type ServiceGroupId,
} from "@workspace/service-taxonomy";
import { PageLayout } from "@/components/layout/PageLayout";
import { ServiceCard } from "@/features/artisans/components/ServiceCard";
import {
  ServiceCategoryDropdown,
  ALL_SERVICES,
  type ServiceFilter,
} from "@/features/artisans/components/ServiceCategoryDropdown";
import { FilterSidebar } from "@/components/common/FilterSidebar";
import { SearchInput } from "@/components/common/SearchInput";
import { useServices } from "@/features/artisans/hooks";
import { useCategories } from "@/features/marketplace/hooks";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import type { Service } from "@/types";

function matchesFilter(service: Service, filter: ServiceFilter): boolean {
  if (filter.category) return service.category === filter.category;
  if (filter.group) return service.group === filter.group;
  return true;
}

function matchesSearch(service: Service, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    service.title.toLowerCase().includes(q) ||
    service.provider.toLowerCase().includes(q) ||
    serviceCategoryLabel(service.category).toLowerCase().includes(q) ||
    service.skills.some((s) => s.toLowerCase().includes(q))
  );
}

// ?category=plumbing or ?group=artisans — how the home page carousel and the
// footer links deep-link straight into a trade. Anything unrecognised falls
// back to showing everything rather than an empty page.
function filterFromQuery(query: string): ServiceFilter {
  const params = new URLSearchParams(query);
  const category = params.get("category");
  if (category && isServiceCategoryId(category)) {
    return { group: groupForCategory(category) ?? null, category };
  }
  const group = params.get("group");
  if (group && SERVICE_GROUPS.some((g) => g.id === group)) {
    return { group: group as ServiceGroupId, category: null };
  }
  return ALL_SERVICES;
}

export default function ServicesPage() {
  const query = useSearch();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ServiceFilter>(() => filterFromQuery(query));

  // Re-sync when the URL changes under us (carousel click while already on the
  // page, or back/forward), without fighting in-page dropdown changes.
  useEffect(() => {
    setFilter(filterFromQuery(query));
  }, [query]);

  const { data: services = [], isLoading, isError } = useServices();
  const { data: categories = [] } = useCategories();

  const displayedServices = useMemo(
    () => services.filter((s) => matchesFilter(s, filter) && matchesSearch(s, search)),
    [services, filter, search],
  );

  // Counts per group, so the tabs read as a real map of who's on the platform.
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) counts.set(s.group, (counts.get(s.group) ?? 0) + 1);
    return counts;
  }, [services]);

  return (
    <PageLayout mainClassName="container-app py-24 md:py-32">
      {/* Provider groups — the top level of the taxonomy, always visible so it's
          obvious the platform holds freelancers, artisans and businesses. */}
      <div className="mb-8">
        <h1 className="heading-page text-foreground">Find a professional</h1>
        <p className="mt-1 text-muted-foreground">
          Freelancers, artisans and registered businesses — filtered by the work they actually do.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <GroupChip
            label="All services"
            count={services.length}
            active={!filter.group}
            onClick={() => setFilter(ALL_SERVICES)}
          />
          {SERVICE_GROUPS.map((g) => (
            <GroupChip
              key={g.id}
              label={g.label}
              count={groupCounts.get(g.id) ?? 0}
              active={filter.group === g.id}
              onClick={() => setFilter({ group: g.id, category: null })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <FilterSidebar
          categories={categories}
          rangeLabel="Hourly Rate"
          rangeDefault={[20, 200]}
          rangeMax={500}
          rangeStep={10}
          rangeMinLabel="£20"
          rangeMaxLabel="£500+"
        />

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <ServiceCategoryDropdown
                value={filter}
                onChange={setFilter}
                className="w-full sm:w-64"
              />
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search services..."
                className="max-w-md"
                inputClassName="bg-white border border-border"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Showing {displayedServices.length}{" "}
                {displayedServices.length === 1 ? "service" : "services"}
              </span>
              <select className="border-border rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option>Relevance</option>
                <option>Highest Rated</option>
                <option>Newest</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <Loading label="Loading services…" />
          ) : isError ? (
            <ErrorState />
          ) : displayedServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <p className="font-medium text-foreground">
                No {filter.category ? serviceCategoryLabel(filter.category) : filter.group ? serviceGroupLabel(filter.group) : ""} listings yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a nearby category, or clear the filter to see everyone.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter(ALL_SERVICES);
                  setSearch("");
                }}
                className="mt-4 text-sm font-semibold text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedServices.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function GroupChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {label}
      <span className={`text-xs ${active ? "text-white/75" : "text-muted-foreground/70"}`}>{count}</span>
    </button>
  );
}
