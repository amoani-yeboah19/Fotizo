import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import {
  SERVICE_GROUPS,
  SERVICE_CATEGORIES,
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
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/contexts/CurrencyContext";
import { SearchInput } from "@/components/common/SearchInput";
import { useServices } from "@/features/artisans/hooks";
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
  const [search, setSearch] = useState(
    () => new URLSearchParams(query).get("q") ?? "",
  );
  useEffect(() => {
    setSearch(new URLSearchParams(query).get("q") ?? "");
  }, [query]);
  const [filter, setFilter] = useState<ServiceFilter>(() =>
    filterFromQuery(query),
  );

  // Re-sync when the URL changes under us (carousel click while already on the
  // page, or back/forward), without fighting in-page dropdown changes.
  useEffect(() => {
    setFilter(filterFromQuery(query));
  }, [query]);

  const { data: services = [], isLoading, isError } = useServices();
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("relevance");
  const { currency, convert } = useCurrency();
  const invalidRange =
    !!minRate && !!maxRate && Number(minRate) > Number(maxRate);
  const reset = () => {
    setFilter(ALL_SERVICES);
    setSearch("");
    setMinRate("");
    setMaxRate("");
    setMinRating(0);
    setSort("relevance");
  };
  const categories = SERVICE_CATEGORIES.filter(
    (c) => !filter.group || c.group === filter.group,
  );
  const counts = new Map<string, number>();
  services.forEach((s) =>
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1),
  );

  const displayedServices = useMemo(() => {
    if (invalidRange) return [];
    const results = services.filter(
      (s) =>
        matchesFilter(s, filter) &&
        matchesSearch(s, search) &&
        (!minRate || convert(s.hourlyRate) >= Number(minRate)) &&
        (!maxRate || convert(s.hourlyRate) <= Number(maxRate)) &&
        (!minRating || (s.reviewCount > 0 && s.rating >= minRating)),
    );
    if (sort === "rating")
      results.sort(
        (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      );
    if (sort === "price-low")
      results.sort((a, b) => a.hourlyRate - b.hourlyRate);
    if (sort === "price-high")
      results.sort((a, b) => b.hourlyRate - a.hourlyRate);
    return results;
  }, [
    services,
    filter,
    search,
    minRate,
    maxRate,
    minRating,
    sort,
    convert,
    invalidRange,
  ]);

  // Counts per group, so the tabs read as a real map of who's on the platform.
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services)
      counts.set(s.group, (counts.get(s.group) ?? 0) + 1);
    return counts;
  }, [services]);

  return (
    <PageLayout mainClassName="container-app py-24 md:py-32">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary/5 p-5">
        <div>
          <p className="font-semibold">
            Your expertise deserves a place of its own.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build your professional profile and introduce the work you do best.
          </p>
        </div>
        <Link
          href="/profile"
          className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-white"
        >
          Create your profile →
        </Link>
      </div>
      {/* Provider groups — the top level of the taxonomy, always visible so it's
          obvious the platform holds freelancers, artisans and businesses. */}
      <div className="mb-8">
        <h1 className="heading-page text-foreground">Find a professional</h1>
        <p className="mt-1 text-muted-foreground">
          Freelancers, artisans and registered businesses — filtered by the work
          they actually do.
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
        <aside
          aria-label="Service filters"
          className="w-full md:w-64 shrink-0 md:sticky md:top-28 md:self-start md:max-h-[calc(100dvh-8rem)] md:overflow-y-auto md:pr-2"
        >
          <details open className="rounded-2xl border bg-white p-5">
            <summary className="cursor-pointer font-semibold">
              Service filters
            </summary>
            <div className="mt-5 space-y-6">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  Service category
                </legend>
                <div className="max-h-64 space-y-3 overflow-y-auto pr-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="service-category"
                      checked={!filter.category}
                      onChange={() => setFilter({ ...filter, category: null })}
                    />
                    All categories in this group
                  </label>
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="service-category"
                        checked={filter.category === c.id}
                        onChange={() =>
                          setFilter({ group: c.group, category: c.id })
                        }
                      />
                      <span>{c.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {counts.get(c.id) ?? 0}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="border-t pt-5">
                <legend className="text-sm font-semibold">
                  Hourly rate ({currency.code})
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs">
                    Minimum
                    <Input
                      aria-label="Minimum hourly rate"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={minRate}
                      onChange={(e) => setMinRate(e.target.value)}
                    />
                  </label>
                  <label className="text-xs">
                    Maximum
                    <Input
                      aria-label="Maximum hourly rate"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Any"
                      value={maxRate}
                      onChange={(e) => setMaxRate(e.target.value)}
                    />
                  </label>
                </div>
                {invalidRange && (
                  <p role="alert" className="mt-2 text-xs text-destructive">
                    Maximum rate must be at least the minimum rate.
                  </p>
                )}
              </fieldset>
              <fieldset className="border-t pt-5">
                <legend className="text-sm font-semibold">Client rating</legend>
                <div className="mt-3 space-y-3">
                  {[0, 4, 3, 2].map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="service-rating"
                        checked={minRating === r}
                        onChange={() => setMinRating(r)}
                      />
                      {r ? `${r} stars & up` : "Any rating"}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                onClick={reset}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Reset all filters
              </button>
            </div>
          </details>
        </aside>

        <div className="flex-1 min-w-0">
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
              <select
                aria-label="Sort services"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border-border rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Highest rated</option>
                <option value="price-low">Hourly rate: low to high</option>
                <option value="price-high">Hourly rate: high to low</option>
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
                No{" "}
                {filter.category
                  ? serviceCategoryLabel(filter.category)
                  : filter.group
                    ? serviceGroupLabel(filter.group)
                    : ""}{" "}
                services match your filters
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try another category or adjust your search, hourly rate and
                rating filters.
              </p>
              <button
                type="button"
                onClick={reset}
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
      <span
        className={`text-xs ${active ? "text-white/75" : "text-muted-foreground/70"}`}
      >
        {count}
      </span>
    </button>
  );
}
