import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ProductCard } from "@/components/common/ProductCard";
import { FilterSidebar } from "@/components/common/FilterSidebar";
import { SearchInput } from "@/components/common/SearchInput";
import { useProducts, useCategories } from "@/features/marketplace/hooks";
import { Loading, ErrorState } from "@/components/common/QueryStates";

export default function ProductsPage() {
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading, isError } = useProducts();
  const { data: categories = [] } = useCategories();
  const displayedProducts = products;

  return (
    <PageLayout mainClassName="container-app py-24 md:py-32">
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
