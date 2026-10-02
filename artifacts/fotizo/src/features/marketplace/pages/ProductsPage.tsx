import {
  ShoppingBag,
  Headphones,
  Armchair,
  Shirt,
  Heart,
  Store,
  ArrowUpRight,
} from "lucide-react";
import { CatalogueHero } from "@/components/catalogue/CatalogueHero";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { FilterSidebar } from "@/components/common/FilterSidebar";
import { SearchInput } from "@/components/common/SearchInput";
import { LoadMoreSentinel } from "@/components/common/LoadMoreSentinel";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useCatalogueCategories,
  useCatalogueInfinite,
} from "@/features/marketplace/hooks/useCatalogue";
import type { CatalogueFilters } from "@/features/marketplace/services/catalogue-page";
import { categoryLabel } from "@/features/shop/data/categories";
import type { Category, Product } from "@/types";

type Sort =
  | "Relevance"
  | "Price: Low to High"
  | "Price: High to Low"
  | "Top Rated";
const SERVER_SORT: Record<Sort, NonNullable<CatalogueFilters["sort"]>> = {
  Relevance: "newest",
  "Price: Low to High": "price-asc",
  "Price: High to Low": "price-desc",
  "Top Rated": "rating",
};
const PRICE_MAX = 2000;

export default function ProductsPage() {
  // Category links (e.g. from the home page) arrive as ?category=<id>; the
  // global search's "See all" link arrives as ?q=<text>.
  const query = useSearch();
  const [search, setSearch] = useState(
    () => new URLSearchParams(query).get("q") ?? "",
  );
  useEffect(() => {
    const q = new URLSearchParams(query).get("q");
    if (q !== null) setSearch(q);
  }, [query]);
  const [category, setCategory] = useState<string | null>(() =>
    new URLSearchParams(query).get("category"),
  );
  useEffect(() => {
    setCategory(new URLSearchParams(query).get("category"));
  }, [query]);
  const [price, setPrice] = useState<[number, number] | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("Relevance");
  const q = useDebouncedValue(search.trim());

  // Search, filters and sort run on the server across all marketplace
  // listings; Fotizo Shop stock is a separate channel and never appears here.
  const grid = useCatalogueInfinite("marketplace", {
    q: q || undefined,
    category: category ?? undefined,
    minPrice: price && price[0] > 0 ? price[0] : undefined,
    maxPrice: price && price[1] < PRICE_MAX ? price[1] : undefined,
    minRating: minRating ?? undefined,
    inStock: inStock || undefined,
    sort: SERVER_SORT[sort],
  });
  const { isLoading, isError } = grid;
  const displayedProducts = useMemo(
    () => (grid.data?.pages.flatMap((p) => p.items) ?? []) as Product[],
    [grid.data],
  );
  const total = grid.data?.pages[0]?.total ?? 0;

  const categoryCounts = useCatalogueCategories("marketplace").data;
  const categories = useMemo<Category[]>(
    () =>
      [...(categoryCounts ?? [])]
        .sort((a, b) => b.count - a.count)
        .map((c) => ({
          id: c.category,
          name: categoryLabel(c.category),
          icon: "",
          count: c.count,
        })),
    [categoryCounts],
  );

  return (
    <PageLayout mainClassName="pt-20">
      <div className="catalogue-storefront">
        <div className="container-app">
          <CatalogueHero
            eyebrow="Fotizo · Local marketplace"
            title="Local finds."
            accent="Everyday favourites."
            description="Discover products from sellers on Fotizo. Find something for your home, your wardrobe, or your next everyday upgrade."
            target="#local-listings"
            action="Explore local finds"
          >
            <div className="catalogue-local-art" aria-hidden="true">
              <span>
                <ShoppingBag />
                Everyday finds
              </span>
              <span>
                <Armchair />
                Your space
              </span>
              <span>
                <Headphones />
                Your tech
              </span>
              <span>
                <Shirt />
                Your style
              </span>
            </div>
          </CatalogueHero>
          <div className="catalogue-benefits">
            <div>
              <Store size={21} aria-hidden="true" />
              <span>
                <strong>Discover local sellers</strong>
                <p>Explore their products in one place</p>
              </span>
            </div>
            <div>
              <Heart size={21} aria-hidden="true" />
              <span>
                <strong>Save what catches your eye</strong>
                <p>Build a wishlist of your favourites</p>
              </span>
            </div>
            <div>
              <ShoppingBag size={21} aria-hidden="true" />
              <span>
                <strong>Looking further afield?</strong>
                <p>
                  <Link href="/shop">
                    Explore imported goods in Fotizo Shop{" "}
                    <ArrowUpRight
                      className="inline"
                      size={12}
                      aria-hidden="true"
                    />
                  </Link>
                </p>
              </span>
            </div>
          </div>
          <section
            id="local-listings"
            className="catalogue-results"
            aria-label="Local marketplace listings"
          >
            <p className="catalogue-eyebrow">
              Find something that feels like you
            </p>
            <h2>Explore the local marketplace</h2>
            <div
              className="catalogue-departments"
              aria-label="Browse departments"
            >
              <button
                aria-pressed={category === null}
                onClick={() => setCategory(null)}
              >
                All departments
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  aria-pressed={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
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
                selectedCategory={category}
                onCategoryChange={setCategory}
                onRangeCommit={setPrice}
                minRating={minRating}
                onMinRatingChange={setMinRating}
                inStock={inStock}
                onInStockChange={setInStock}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search products..."
                    className="max-w-md"
                    inputClassName="bg-white border border-border"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Showing {total} products
                    </span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as Sort)}
                      aria-label="Sort products"
                      className="border-border rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
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
                      {search || category || price || minRating || inStock
                        ? "Nothing matches that search"
                        : "No seller listings yet"}
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
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayedProducts.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                    <LoadMoreSentinel
                      hasMore={Boolean(grid.hasNextPage)}
                      loading={grid.isFetchingNextPage}
                      onLoadMore={() => void grid.fetchNextPage()}
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
