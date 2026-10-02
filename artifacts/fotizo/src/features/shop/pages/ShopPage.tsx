import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import {
  LayoutGrid,
  Search,
  ArrowUpRight,
  ArrowRight,
  Globe2,
  Heart,
  Package,
  X,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { LoadMoreSentinel } from "@/components/common/LoadMoreSentinel";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useCatalogueInfinite,
  useCataloguePage,
} from "@/features/marketplace/hooks/useCatalogue";
import type { CatalogueFilters } from "@/features/marketplace/services/catalogue-page";
import { toShopProduct } from "@/features/shop/services/shop.service";
import { ShopProductCard } from "@/features/shop/components/ShopProductCard";
import "./shop.css";
import { SHOP_CATEGORIES, categoryLabel } from "@/features/shop/data/products";
import type { Product } from "@/types";

type Sort =
  | "recommended"
  | "price-asc"
  | "price-desc"
  | "best-selling"
  | "discount";

// Sorting, search and department filtering run on the server over the whole
// published shop; the grid appends 48-item pages as it scrolls.
const SERVER_SORT: Record<Sort, NonNullable<CatalogueFilters["sort"]>> = {
  recommended: "newest",
  "best-selling": "best-selling",
  discount: "discount",
  "price-asc": "price-asc",
  "price-desc": "price-desc",
};
const toCards = (items: unknown[]) =>
  items.map((p) => toShopProduct(p as Product));

const SORTS: { value: Sort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "best-selling", label: "Best selling" },
  { value: "discount", label: "Biggest discount" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

// ?category=wigs — how the hero chips and marketing links land straight in a
// department. An unknown id falls back to the full catalogue rather than an
// empty page.
function categoryFromQuery(query: string): string | null {
  const id = new URLSearchParams(query).get("category");
  return id && SHOP_CATEGORIES.some((c) => c.id === id) ? id : null;
}

export default function ShopPage() {
  const query = useSearch();
  const [activeCat, setActiveCat] = useState<string | null>(() =>
    categoryFromQuery(query),
  );
  const [sort, setSort] = useState<Sort>("recommended");
  const [search, setSearch] = useState(
    () => new URLSearchParams(query).get("q") ?? "",
  );
  useEffect(() => {
    const q = new URLSearchParams(query).get("q");
    setSearch(q ?? "");
  }, [query]);

  // Re-sync when the URL changes under us (another chip clicked while already
  // on the page, or back/forward), without fighting in-page tab changes.
  useEffect(() => {
    setActiveCat(categoryFromQuery(query));
  }, [query]);

  const q = useDebouncedValue(search.trim());
  const grid = useCatalogueInfinite("shop", {
    category: activeCat ?? undefined,
    q: q || undefined,
    sort: SERVER_SORT[sort],
  });
  const { isLoading, isError } = grid;
  const products = useMemo(
    () => toCards(grid.data?.pages.flatMap((p) => p.items) ?? []),
    [grid.data],
  );
  const total = grid.data?.pages[0]?.total ?? 0;

  const [edit, setEdit] = useState("furniture");
  const featuredQuery = useCataloguePage("shop", {
    category: edit,
    sort: "newest",
    pageSize: 8,
  });
  const featured = useMemo(
    () => toCards(featuredQuery.data?.items ?? []).slice(0, 8),
    [featuredQuery.data],
  );
  const browse = (category: string | null) => {
    setActiveCat(category);
    setSearch("");
    document
      .getElementById("shop-catalogue")
      ?.scrollIntoView({ block: "start" });
  };

  return (
    <PageLayout mainClassName="pt-20">
      <div className="fotizo-shop">
        <div className="shop-announcement">
          <Globe2 size={14} aria-hidden="true" /> Global finds. A little more
          you.
        </div>
        <div className="container-app">
          <section className="shop-hero" aria-labelledby="shop-heading">
            <div className="shop-hero-copy">
              <p className="shop-eyebrow">THE FOTIZO SHOP</p>
              <h1 id="shop-heading">
                Good finds.
                <br />
                Great <em>feeling.</em>
              </h1>
              <p className="shop-hero-description">
                For your space, your style, and everything in between. Discover
                your next favourite thing.
              </p>
              <button className="shop-primary" onClick={() => browse(null)}>
                Explore the shop <ArrowRight size={18} aria-hidden="true" />
              </button>
              <div className="shop-hero-footnote">
                <span /> A world of possibilities, in one place
              </div>
            </div>
            <button
              className="shop-hero-photo"
              onClick={() => browse("furniture")}
              aria-label="Explore furniture"
            >
              <img
                src="/images/taobao/751554742379.webp"
                alt="White sofa in a warm contemporary living room"
                fetchPriority="high"
              />
              <span className="shop-photo-label">
                <span>
                  <small>THE HOME EDIT</small>
                  <strong>Make room for lovely.</strong>
                </span>
                <ArrowUpRight size={25} aria-hidden="true" />
              </span>
            </button>
            <span className="shop-hero-stamp" aria-hidden="true">
              Find it.
              <br />
              Love it.
              <br />
              <Heart size={19} />
            </span>
          </section>

          <div className="shop-service-strip">
            <span>
              <Globe2 size={18} aria-hidden="true" />
              <span>
                <strong>Discover beyond the everyday</strong>
                <small>Goods from global suppliers</small>
              </span>
            </span>
            <span>
              <Heart size={18} aria-hidden="true" />
              <span>
                <strong>Keep your favourites close</strong>
                <small>Tap the heart to save a find</small>
              </span>
            </span>
            <span>
              <Package size={18} aria-hidden="true" />
              <span>
                <strong>A little planning, a great find</strong>
                <small>Imported prices are estimates; delivery extra</small>
              </span>
            </span>
          </div>

          <section className="shop-discover" aria-labelledby="discover-heading">
            <div className="shop-section-heading">
              <div>
                <p className="shop-eyebrow">FOLLOW YOUR CURIOSITY</p>
                <h2 id="discover-heading">What are you shopping for?</h2>
              </div>
              <a href="#shop-catalogue">
                Browse everything <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="shop-edits">
              {[
                {
                  category: "furniture",
                  label: "A space to love",
                  detail: "HOME & LIVING",
                  image: "/images/taobao/715620281290.webp",
                  colour: "home",
                },
                {
                  category: "shoes-bags",
                  label: "Go your own way",
                  detail: "BAGS & EVERYDAY STYLE",
                  image: "/images/taobao/1057339107842.webp",
                  colour: "style",
                },
                {
                  category: "computers",
                  label: "Upgrade the everyday",
                  detail: "TECH & ACCESSORIES",
                  image: "/images/taobao/977177423432.webp",
                  colour: "tech",
                },
              ].map((item) => (
                <button
                  key={item.category}
                  className={`shop-edit shop-edit-${item.colour}`}
                  onClick={() => browse(item.category)}
                >
                  <img loading="lazy" src={item.image} alt="" />
                  <span>
                    <small>{item.detail}</small>
                    <strong>{item.label}</strong>
                    <span className="shop-edit-link">
                      Discover the edit{" "}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {activeCat === null && !search && (
            <section
              className="shop-featured"
              aria-labelledby="featured-heading"
            >
              <div className="shop-section-heading">
                <div>
                  <p className="shop-eyebrow">PAUSE. SCROLL. FALL IN LOVE.</p>
                  <h2 id="featured-heading">Worth a closer look.</h2>
                </div>
                <div
                  className="shop-edit-tabs"
                  aria-label="Featured collections"
                >
                  {[
                    { id: "furniture", label: "The home edit" },
                    { id: "shoes-bags", label: "Everyday style" },
                    { id: "computers", label: "Smart upgrades" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      aria-pressed={edit === tab.id}
                      onClick={() => setEdit(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {featuredQuery.isLoading ? (
                <Loading label="Finding your next favourite…" />
              ) : featuredQuery.isError ? (
                <div className="py-6 text-sm">
                  These finds could not be loaded.{" "}
                  <button
                    className="underline"
                    onClick={() => void featuredQuery.refetch()}
                  >
                    Try again
                  </button>
                </div>
              ) : featured.length ? (
                <div className="shop-featured-track">
                  {featured.map((product) => (
                    <ShopProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <p className="py-6 text-sm">
                  More finds are on their way. Explore the catalogue below.
                </p>
              )}
              <button className="shop-text-link" onClick={() => browse(edit)}>
                Explore this collection{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </section>
          )}

          <section
            id="shop-catalogue"
            className="shop-catalogue"
            aria-label="Shop catalogue"
          >
            <p className="shop-eyebrow">YOUR NEXT FIND STARTS HERE</p>
            <div className="shop-category-strip" aria-label="Shop departments">
              <CategoryTile
                label="All"
                icon={<LayoutGrid size={17} aria-hidden="true" />}
                active={activeCat === null}
                onClick={() => setActiveCat(null)}
              />
              {SHOP_CATEGORIES.map((c) => {
                const Icon = c.icon;
                return (
                  <CategoryTile
                    key={c.id}
                    label={c.label}
                    icon={<Icon size={17} aria-hidden="true" />}
                    active={activeCat === c.id}
                    onClick={() => setActiveCat(c.id)}
                  />
                );
              })}
            </div>
            {/* Grid header: title + search + sort */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {activeCat ? categoryLabel(activeCat) : "All products"}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({total})
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search the shop…"
                    aria-label="Search the shop"
                    className="w-full min-w-0 rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 sm:w-64"
                  />
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  aria-label="Sort products"
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(search || activeCat) && (
              <button
                className="shop-text-link"
                onClick={() => {
                  setSearch("");
                  setActiveCat(null);
                }}
              >
                <X size={14} aria-hidden="true" /> Clear filters
              </button>
            )}
            {/* Product grid */}
            {isLoading ? (
              <Loading label="Loading the shop…" />
            ) : isError ? (
              <ErrorState label="The shop could not be loaded. Please try again." />
            ) : products.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <Search
                  className="mx-auto mb-3 h-8 w-8 opacity-40"
                  aria-hidden="true"
                />
                <p>
                  {activeCat === null && !q
                    ? "No products are listed yet."
                    : "No products match your search."}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {products.map((p) => (
                    <ShopProductCard key={p.id} product={p} />
                  ))}
                </div>
                <LoadMoreSentinel
                  hasMore={Boolean(grid.hasNextPage)}
                  loading={grid.isFetchingNextPage}
                  onLoadMore={() => void grid.fetchNextPage()}
                />
              </>
            )}
          </section>
          <div className="shop-bottom-note">
            <Globe2 size={24} aria-hidden="true" />
            <div>
              <strong>Global discoveries. Thoughtful shopping.</strong>
              <p>
                Supplier images may contain Chinese text. Confirm options, final
                pricing and delivery before ordering imported goods.
              </p>
            </div>
          </div>
        </div>
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
      className={`shop-category ${active ? "is-active" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
