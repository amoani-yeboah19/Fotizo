import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ServiceCard } from "@/features/artisans/components/ServiceCard";
import { FilterSidebar } from "@/components/common/FilterSidebar";
import { SearchInput } from "@/components/common/SearchInput";
import { useServices } from "@/features/artisans/hooks";
import { useCategories } from "@/features/marketplace/hooks";
import { Loading, ErrorState } from "@/components/common/QueryStates";

export default function ServicesPage() {
  const [search, setSearch] = useState("");

  const { data: services = [], isLoading, isError } = useServices();
  const { data: categories = [] } = useCategories();
  const displayedServices = services;

  return (
    <PageLayout mainClassName="container-app py-24 md:py-32">
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
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search services..."
              className="max-w-md"
              inputClassName="bg-white border border-border"
            />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Showing {displayedServices.length} services
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
