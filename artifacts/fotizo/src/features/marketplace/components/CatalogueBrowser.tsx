import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  useCataloguePage,
  useCatalogueCategories,
} from "../hooks/useCatalogue";
import type {
  CatalogueChannel,
  CatalogueFilters,
} from "../services/catalogue-page";
import type { Product } from "@/types";
import { categoryLabel } from "@/features/shop/data/categories";

export function CatalogueBrowser({
  channel,
  initialCategory = "",
  renderProduct,
}: {
  channel: CatalogueChannel;
  initialCategory?: string;
  renderProduct: (product: Product) => ReactNode;
}) {
  const [filters, setFilters] = useState<CatalogueFilters>({
    page: 0,
    pageSize: 24,
    sort: "newest",
    category: initialCategory || undefined,
  });
  const [search, setSearch] = useState("");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [validation, setValidation] = useState("");
  useEffect(() => {
    setFilters((v) => ({
      ...v,
      category: initialCategory || undefined,
      page: 0,
    }));
  }, [initialCategory]);
  const query = useCataloguePage(channel, filters);
  const categories = useCatalogueCategories(channel);
  const change = (next: CatalogueFilters) =>
    setFilters((v) => ({ ...v, ...next, page: 0 }));
  function apply(event: FormEvent) {
    event.preventDefault();
    const minPrice = minimum === "" ? undefined : Number(minimum);
    const maxPrice = maximum === "" ? undefined : Number(maximum);
    if (
      [minPrice, maxPrice].some(
        (v) =>
          v !== undefined && (!Number.isFinite(v) || v < 0 || v > 99999999.99),
      ) ||
      (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    ) {
      setValidation(
        "Enter a valid price range with minimum no greater than maximum.",
      );
      return;
    }
    setValidation("");
    change({ q: search.trim(), minPrice, maxPrice });
  }
  const page = filters.page ?? 0;
  const label = (value: string) =>
    channel === "shop" ? categoryLabel(value) : value;
  const inputClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm";
  return (
    <section
      aria-label={
        channel === "shop" ? "Shop catalogue" : "Marketplace catalogue"
      }
      className="space-y-6"
    >
      <form
        onSubmit={apply}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="space-y-1 text-sm">
          Search products
          <input
            className={inputClass}
            aria-label="Search products"
            maxLength={120}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
          />
        </label>
        <label className="space-y-1 text-sm">
          Minimum price (GBP)
          <input
            className={inputClass}
            aria-label="Minimum price (GBP)"
            type="number"
            min="0"
            max="99999999.99"
            step="0.01"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          Maximum price (GBP)
          <input
            className={inputClass}
            aria-label="Maximum price (GBP)"
            type="number"
            min="0"
            max="99999999.99"
            step="0.01"
            value={maximum}
            onChange={(e) => setMaximum(e.target.value)}
          />
        </label>
        <Button type="submit" className="self-end">
          Apply search and price
        </Button>
      </form>
      {validation && <p role="alert">{validation}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">
          Category
          <select
            className={inputClass}
            aria-label="Category"
            value={filters.category ?? ""}
            onChange={(e) => change({ category: e.target.value || undefined })}
          >
            <option value="">All categories</option>
            {filters.category &&
              !categories.data?.some(
                (c) => c.category === filters.category,
              ) && (
                <option value={filters.category}>
                  {label(filters.category)}
                </option>
              )}
            {categories.data?.map((c) => (
              <option key={c.category} value={c.category}>
                {label(c.category)} ({c.count})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Sort products
          <select
            className={inputClass}
            aria-label="Sort products"
            value={filters.sort}
            onChange={(e) =>
              change({ sort: e.target.value as CatalogueFilters["sort"] })
            }
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top rated</option>
            <option value="discount">Biggest discount (%)</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Minimum rating
          <select
            className={inputClass}
            aria-label="Minimum rating"
            value={filters.minRating ?? ""}
            onChange={(e) =>
              change({
                minRating:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          >
            <option value="">Any rating</option>
            <option value="4">4 stars and up</option>
            <option value="3">3 stars and up</option>
            <option value="2">2 stars and up</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm self-end py-2">
          <input
            type="checkbox"
            checked={filters.inStock ?? false}
            onChange={(e) => change({ inStock: e.target.checked })}
          />
          In stock only
        </label>
      </div>
      {categories.isError && (
        <div role="alert">
          Categories could not be loaded.{" "}
          <Button variant="link" onClick={() => void categories.refetch()}>
            Retry categories
          </Button>
        </div>
      )}
      <Button
        variant="outline"
        onClick={() => {
          setSearch("");
          setMinimum("");
          setMaximum("");
          setValidation("");
          setFilters({ page: 0, pageSize: 24, sort: "newest" });
        }}
      >
        Clear filters
      </Button>
      {query.isPending ? (
        <p role="status">Loading products...</p>
      ) : query.isError ? (
        <div role="alert" className="space-y-3">
          <p>Products could not be loaded. Please retry.</p>
          <Button onClick={() => void query.refetch()}>Retry products</Button>
        </div>
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {query.data.total === 0
              ? "0 products"
              : query.data.items.length === 0
                ? `No products on this page (${query.data.total} matching products).`
                : `Showing ${page * query.data.pageSize + 1}-${page * query.data.pageSize + query.data.items.length} of ${query.data.total} products`}
          </p>
          {query.data.items.length === 0 ? (
            query.data.total === 0 &&
            !filters.q &&
            !filters.category &&
            filters.minPrice == null &&
            filters.maxPrice == null &&
            !filters.minRating &&
            !filters.inStock ? (
              <p>
                {channel === "shop"
                  ? "No products are published in Fotizo Shop yet. Check back soon, or browse the local marketplace."
                  : "No products are listed in the marketplace yet."}
              </p>
            ) : (
              <p>
                No products match this page and its filters. Adjust the filters or
                return to the first page.
              </p>
            )
          ) : (
            <div
              className={
                channel === "shop"
                  ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                  : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              }
            >
              {query.data.items.map((p) => (
                <div key={p.id}>{renderProduct(p)}</div>
              ))}
            </div>
          )}
        </>
      )}
      <nav
        aria-label="Catalogue pagination"
        className="flex flex-wrap items-center gap-4"
      >
        <Button
          variant="outline"
          disabled={page === 0 || query.isFetching}
          onClick={() => setFilters((v) => ({ ...v, page: page - 1 }))}
        >
          Previous
        </Button>
        <span>Page {page + 1}</span>
        <Button
          variant="outline"
          disabled={!query.data?.hasMore || query.isError || query.isFetching}
          onClick={() => setFilters((v) => ({ ...v, page: page + 1 }))}
        >
          Next
        </Button>
        {page > 0 && (
          <Button
            variant="link"
            disabled={query.isFetching}
            onClick={() => setFilters((v) => ({ ...v, page: 0 }))}
          >
            First page
          </Button>
        )}
      </nav>
    </section>
  );
}
