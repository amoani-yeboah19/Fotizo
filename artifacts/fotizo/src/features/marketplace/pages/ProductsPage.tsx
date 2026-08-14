import { useMemo, useState } from "react";
import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { FilterSidebar } from "@/components/common/FilterSidebar";
import { SearchInput } from "@/components/common/SearchInput";
import { useProducts, useCategories } from "@/features/marketplace/hooks";
import { Loading, ErrorState } from "@/components/common/QueryStates";

export default function ProductsPage() {
  const [search, setSearch] = useState("");

  // useProducts is already filtered to seller listings — Fotizo Shop stock is
  // stripped out in the catalog service so it can't appear on the local side.
  const { data: products = [], isLoading, isError } = useProducts();
  const { data: categories = [] } = useCategories();

  const displayedProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <PageLayout mainClassName="container-app py-24 md:py-32">
      <div className="mb-8">
        <h1 className="heading-page text-foreground">Local marketplace</h1>
        <p className="mt-1 text-muted-foreground">
          Products listed by sellers on Fotizo. For imported stock, visit{" "}
          <Link href="/shop">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              Fotizo Shop
            </span>
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <FilterSidebar
          categories={categories}
          showCount
          rangeLabel="Price Range"
          rangeDefault={[50, 1000]}
          rangeMax={2000}
          rangeStep={10}
          rangeMinLabel="£50"
          rangeMaxLabel="£1000+"
          showInStock
        />

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search products..."
              className="max-w-md"
              inputClassName="bg-white border border-border"
            />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Showing {displayedProducts.length} products
              </span>
              <select className="border-border rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option>Relevance</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Top Rated</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <Loading label="Loading products…" />
          ) : isError ? (
            <ErrorState />
          ) : displayedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <p className="font-medium text-foreground">
                {search ? "Nothing matches that search" : "No seller listings yet"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {search
                  ? "Try a different term, or browse Fotizo Shop for imported stock."
                  : "This is the local side of Fotizo — products listed by sellers here. Imported stock lives in Fotizo Shop."}
              </p>
              <Link href="/shop">
                <span className="mt-4 inline-block cursor-pointer text-sm font-semibold text-primary hover:underline">
                  Browse Fotizo Shop →
                </span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
