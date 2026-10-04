import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadPreviewCatalogue } from "../data/preview-catalogue";
import { categoryLabel } from "../data/categories";
import { ShopProductCard } from "./ShopProductCard";

export function PreviewCatalogue() {
  const query = useQuery({
    queryKey: ["shop", "sourcing-preview"],
    queryFn: loadPreviewCatalogue,
    staleTime: Infinity,
  });
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(24);
  const rows = (query.data ?? []).filter(
    (p) =>
      (!category || p.category === category) &&
      `${p.title} ${p.description}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  return (
    <section
      className="my-10 rounded-2xl border border-border bg-muted/30 p-4 sm:p-6"
      aria-labelledby="new-arrivals-heading"
    >
      <p className="shop-eyebrow">EXPLORE WHAT’S NEXT</p>
      <h2 id="new-arrivals-heading" className="text-2xl font-bold">
        New collection preview
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Browse {query.data?.length.toLocaleString() ?? ""} new finds. English
        names and product options are being reviewed. CNY estimates include our
        30% markup; delivery is extra. These previews aren’t available to
        purchase yet.
      </p>
      <div className="my-5 flex flex-wrap gap-3">
        <select
          aria-label="Preview category"
          className="rounded-lg border bg-background p-2"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLimit(24);
          }}
        >
          <option value="">All new finds</option>
          {["mens", "womens", "underwear", "gymwear", "shoes-bags"].map(
            (id) => (
              <option key={id} value={id}>
                {categoryLabel(id)}
              </option>
            ),
          )}
        </select>
        <input
          aria-label="Search preview products"
          placeholder="Search new finds…"
          className="rounded-lg border bg-background p-2"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLimit(24);
          }}
        />
        <span className="self-center text-sm text-muted-foreground">
          {rows.length.toLocaleString()} products
        </span>
      </div>
      {query.isLoading && <p role="status">Loading new finds…</p>}
      {query.isError && (
        <button onClick={() => void query.refetch()}>
          Couldn’t load new finds. Retry
        </button>
      )}
      {!query.isLoading && !query.isError && rows.length === 0 && (
        <p>No matching new finds.</p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {rows.slice(0, limit).map((product) => (
          <ShopProductCard key={product.id} product={product} />
        ))}
      </div>
      {rows.length > limit && (
        <button
          className="shop-primary mt-6"
          onClick={() => setLimit((n) => n + 24)}
        >
          Show more new finds
        </button>
      )}
    </section>
  );
}
