import { useState } from "react";
import { Link } from "wouter";
import { useSellerProducts } from "../../hooks";
import { useOwnedProduct } from "@/features/marketplace/hooks";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SHOP_CATEGORIES } from "@/features/shop/data/categories";
import { RecordImage, exportCsv, selectClass } from "./utils";
import type { SellerProduct } from "@/types";
const SIZE = 20;
const editUrl = (id: string) =>
  `/dashboard/china_representative/products/${encodeURIComponent(id)}/edit`;
const categoryName = (id: string) =>
  SHOP_CATEGORIES.find((c) => c.id === id)?.label ?? id;
const statusName = (p: SellerProduct) =>
  p.status === "unpublished"
    ? "Unpublished"
    : p.stock === 0
      ? "Out of stock"
      : "Live";
export function filterListings(
  items: SellerProduct[],
  search: string,
  category: string,
  status: string,
) {
  const term = search.trim().toLowerCase();
  return items.filter(
    (p) =>
      `${p.title} ${p.id} ${categoryName(p.category)}`
        .toLowerCase()
        .includes(term) &&
      (category === "all" || p.category === category) &&
      (status === "all" ||
        (status === "low"
          ? p.status !== "unpublished" && p.stock <= 5
          : statusName(p) === status)),
  );
}
function ProductDetails({ id }: { id: string }) {
  const query = useOwnedProduct(id);
  const p = query.data;
  if (query.isError)
    return (
      <div role="alert">
        Could not load this product.{" "}
        <Button variant="outline" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  if (query.isLoading) return <p role="status">Loading product details…</p>;
  if (!p) return <p>This product is no longer available to this account.</p>;
  return (
    <div className="space-y-5">
      <RecordImage src={p.image} title={p.title} large />
      {p.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {p.images.map((src, i) => (
            <a
              key={`${src}-${i}`}
              href={src}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open product image ${i + 1}`}
            >
              <RecordImage src={src} title={`${p.title} image ${i + 1}`} />
            </a>
          ))}
        </div>
      )}
      <h3 className="text-xl font-semibold">{p.title}</h3>
      <p className="whitespace-pre-wrap text-sm">{p.description}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <dt>Price</dt>
        <dd>
          <Price amount={p.price} />
        </dd>
        <dt>Stock</dt>
        <dd>{p.stockCount}</dd>
        <dt>Department</dt>
        <dd>{categoryName(p.category)}</dd>
        <dt>Visibility</dt>
        <dd>{p.status === "unpublished" ? "Unpublished" : "Live"}</dd>
        {Object.entries(p.specs).map(([label, value]) => (
          <div key={label} className="col-span-2 grid grid-cols-2 gap-3">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        href={editUrl(id)}
        className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Edit product
      </Link>
    </div>
  );
}
export function SourcedListings() {
  const query = useSellerProducts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const items = query.data ?? [];
  const filtered = filterListings(items, search, category, status);
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / SIZE) - 1),
  );
  const shown = filtered.slice(current * SIZE, (current + 1) * SIZE);
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Sourced listings</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage products owned by your account.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!filtered.length}
          onClick={() =>
            exportCsv("shop-listings.csv", [
              ["ID", "Product", "Department", "Price GBP", "Stock", "Status"],
              ...filtered.map((p) => [
                p.id,
                p.title,
                categoryName(p.category),
                p.price,
                p.stock,
                statusName(p),
              ]),
            ])
          }
        >
          Export results
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 p-4 border-b">
        <Input
          aria-label="Search products"
          placeholder="Search product name or ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="sm:max-w-xs"
        />
        <select
          aria-label="Filter department"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
          className={selectClass}
        >
          <option value="all">All departments</option>
          {[...new Set(items.map((p) => p.category))].sort().map((c) => (
            <option key={c} value={c}>
              {categoryName(c)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter product status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className={selectClass}
        >
          {["all", "Live", "Unpublished", "Out of stock", "low"].map((s) => (
            <option key={s} value={s}>
              {s === "all"
                ? "All statuses"
                : s === "low"
                  ? "Low stock (5 or fewer)"
                  : s}
            </option>
          ))}
        </select>
        {(search || category !== "all" || status !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setStatus("all");
              setPage(0);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
      {query.isLoading ? (
        <p role="status" className="p-6">
          Loading listings…
        </p>
      ) : query.isError ? (
        <div role="alert" className="p-6">
          Could not load products.{" "}
          <Button onClick={() => void query.refetch()}>Retry</Button>
        </div>
      ) : !filtered.length ? (
        <p className="p-8 text-muted-foreground">
          {items.length
            ? "No products match these filters."
            : "No products yet. Add a shop item to get started."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Product",
                    "Department",
                    "Price",
                    "Stock",
                    "Status",
                    "Actions",
                  ].map((t) => (
                    <th key={t} className="p-4">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4">
                      <button
                        className="flex items-center gap-3 text-left hover:text-primary"
                        onClick={() => setSelected(p.id)}
                      >
                        <RecordImage src={p.image} title={p.title} />
                        <span className="min-w-40 max-w-xs">
                          <span className="block font-medium">{p.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.id}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="p-4">{categoryName(p.category)}</td>
                    <td className="p-4">
                      <Price amount={p.price} />
                    </td>
                    <td className="p-4">{p.stock}</td>
                    <td className="p-4">{statusName(p)}</td>
                    <td className="p-4">
                      <div className="flex gap-3 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(p.id)}
                          aria-label={`View ${p.title}`}
                        >
                          View
                        </Button>
                        <Link
                          href={editUrl(p.id)}
                          className="text-primary underline"
                          aria-label={`Edit ${p.title}`}
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav
            aria-label="Product pages"
            className="flex flex-wrap items-center justify-between gap-3 p-4 border-t"
          >
            <span className="text-sm">
              {current * SIZE + 1}–
              {Math.min((current + 1) * SIZE, filtered.length)} of{" "}
              {filtered.length} products
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={(current + 1) * SIZE >= filtered.length}
                onClick={() => setPage(current + 1)}
              >
                Next
              </Button>
            </div>
          </nav>
        </>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Product details</DialogTitle>
          <DialogDescription>
            Inspect your listing before editing it.
          </DialogDescription>
          {selected && <ProductDetails id={selected} />}
        </DialogContent>
      </Dialog>
    </SurfaceCard>
  );
}
