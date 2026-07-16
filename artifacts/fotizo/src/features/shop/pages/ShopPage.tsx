import { useMemo, useState } from "react";
import { LayoutGrid, Search, Flame, Truck, ShieldCheck, PackageCheck } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ShopProductCard } from "@/features/shop/components/ShopProductCard";
import {
  SHOP_CATEGORIES,
  shopProductsByCategory,
  flashDeals,
  categoryLabel,
  type ShopProduct,
} from "@/features/shop/data/products";

type Sort = "recommended" | "price-asc" | "price-desc" | "best-selling" | "discount";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "best-selling", label: "Best selling" },
  { value: "discount", label: "Biggest discount" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

function sortProducts(list: ShopProduct[], sort: Sort): ShopProduct[] {
  const copy = [...list];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "best-selling":
      return copy.sort((a, b) => b.sold - a.sold);
    case "discount":
      return copy.sort((a, b) => b.originalPrice - b.price - (a.originalPrice - a.price));
    default:
      return copy;
  }
}

export default function ShopPage() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recommended");
  const [search, setSearch] = useState("");

  const deals = useMemo(() => flashDeals(12), []);

  const products = useMemo(() => {
    const base = shopProductsByCategory(activeCat);
    const q = search.trim().toLowerCase();
    const filtered = q ? base.filter((p) => p.title.toLowerCase().includes(q)) : base;
    return sortProducts(filtered, sort);
  }, [activeCat, sort, search]);

  return (
    <PageLayout mainClassName="pt-20">
      {/* Hero / promo banner */}
      <section className="bg-gradient-to-r from-[#08275B] via-[#0a2f6e] to-[#FF6A00]">
        <div className="container-app py-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Fotizo Shop</p>
              <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Imported straight from the source</h1>
              <p className="mt-1 text-sm text-white/80">
                Thousands of styles from our global suppliers — up to 70% off, shipped to your door.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Truck, label: "Free shipping" },
                { icon: ShieldCheck, label: "Buyer protection" },
                { icon: PackageCheck, label: "Quality checked" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container-app py-6">
        {/* Category tiles */}
        <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
          <div className="flex w-max gap-3 pb-2">
            <CategoryTile
              label="All"
              icon={<LayoutGrid className="h-6 w-6" aria-hidden="true" />}
              active={activeCat === null}
              onClick={() => setActiveCat(null)}
            />
            {SHOP_CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <CategoryTile
                  key={c.id}
                  label={c.label}
                  icon={<Icon className="h-6 w-6" aria-hidden="true" />}
                  active={activeCat === c.id}
                  onClick={() => setActiveCat(c.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Lightning deals (only on the "All" view) */}
        {activeCat === null && !search && (
          <section className="mt-6 rounded-2xl border border-[#FF6A00]/20 bg-[#FF6A00]/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-[#FF6A00]" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-foreground">Lightning Deals</h2>
              <span className="ml-auto text-xs font-semibold text-[#FF6A00]">Ends soon</span>
            </div>
            <div className="-mx-1 overflow-x-auto px-1" style={{ scrollbarWidth: "none" }}>
              <div className="flex w-max gap-3">
                {deals.map((p) => (
                  <div key={p.id} className="w-36 shrink-0 sm:w-40">
                    <ShopProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Grid header: title + search + sort */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {activeCat ? categoryLabel(activeCat) : "All products"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({products.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the shop…"
                aria-label="Search the shop"
                className="w-40 rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 sm:w-56"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort products"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product grid */}
        {products.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
            <p>No products match your search.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <ShopProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function CategoryTile({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-20"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors sm:h-16 sm:w-16 ${
          active ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-center text-[11px] leading-tight ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </button>
  );
}
