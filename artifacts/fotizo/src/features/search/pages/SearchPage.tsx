import type { ReactNode } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, SearchX } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { ShopProductCard } from "@/features/shop/components/ShopProductCard";
import { ServiceCard } from "@/features/artisans/components/ServiceCard";
import { VehicleCard } from "@/features/autos/components/VehicleCard";
import { MIN_SEARCH_LENGTH, searchLinks, searchService } from "../services/search.service";

const PER_GROUP = 8;

function Group({ title, total, href, children }: { title: string; total: number; href: string; children: ReactNode }) {
  if (!total) return null;
  return (
    <section className="mb-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="heading-sub">
          {title} <span className="text-muted-foreground font-normal">({total})</span>
        </h2>
        {total > PER_GROUP && (
          <Link href={href} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            See all {total} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Everything that matches a search, grouped by where it lives on Fotizo. */
export default function SearchPage() {
  const q = (new URLSearchParams(useSearch()).get("q") ?? "").trim();
  const ready = q.length >= MIN_SEARCH_LENGTH;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["global-search-page", q],
    queryFn: () => searchService.global(q, PER_GROUP),
    enabled: ready,
  });
  const total = data ? data.products.total + data.shop.total + data.services.total + data.vehicles.total : 0;

  return (
    <PageLayout mainClassName="container-app py-12">
      <h1 className="heading-page mb-2">{ready ? <>Results for “{q}”</> : "Search Fotizo"}</h1>
      <p className="text-muted-foreground mb-10">
        {!ready
          ? "Type at least two characters in the search bar to find products, services and vehicles."
          : data
            ? `${total} result${total === 1 ? "" : "s"} across products, the Fotizo Shop, services and vehicles.`
            : "Searching products, the Fotizo Shop, services and vehicles…"}
      </p>
      {!ready ? null : isLoading ? (
        <Loading label="Searching…" />
      ) : isError || !data ? (
        <div className="space-y-4">
          <ErrorState label="Search isn't available right now." />
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<SearchX className="w-12 h-12" />}
          title={`No results for “${q}”`}
          description="Check the spelling or try a shorter, more general term."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/products">
                <Button variant="outline">Browse products</Button>
              </Link>
              <Link href="/services">
                <Button variant="outline">Browse services</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <Group title="Products" total={data.products.total} href={searchLinks.all.products(q)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.products.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </Group>
          <Group title="Fotizo Shop" total={data.shop.total} href={searchLinks.all.shop(q)}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {data.shop.items.map((p) => (
                <ShopProductCard key={p.id} product={p} />
              ))}
            </div>
          </Group>
          <Group title="Services" total={data.services.total} href={searchLinks.all.services(q)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.services.items.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </Group>
          <Group title="Vehicles" total={data.vehicles.total} href={searchLinks.all.vehicles()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.vehicles.items.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          </Group>
        </>
      )}
    </PageLayout>
  );
}
