import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Sparkles,
  History,
  X,
  Tag,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { LoadMoreSentinel } from "@/components/common/LoadMoreSentinel";
import { Price } from "@/components/common/Price";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFeedScrollRestore } from "@/hooks/useFeedScrollRestore";
import {
  useShopCatalogueInfinite,
  useShopCataloguePage,
} from "../services/shop-catalogue";
import { ShopProductCard } from "../components/ShopProductCard";
import { SHOP_CATEGORIES, categoryLabel } from "../data/categories";
import {
  SHOP_COLLECTIONS,
  matchesCollection,
  discoveryPicks,
} from "../data/shop-discovery";
import { loadSourcedCatalogue } from "../data/sourced-catalogue";
import type { ShopProduct } from "../data/shop-product";
import { useShopHistory } from "../hooks/useShopHistory";
import "./shop.css";

type Sort = "newest" | "price-asc" | "price-desc" | "best-selling" | "discount";
const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest finds" },
  { value: "price-asc", label: "Lowest price" },
  { value: "price-desc", label: "Highest price" },
  { value: "best-selling", label: "Best selling" },
  { value: "discount", label: "Biggest discount" },
];
const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ block: "start" });
export default function ShopPage() {
  const query = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(query);
  const category = params.get("category");
  const activeCat = SHOP_CATEGORIES.some((c) => c.id === category)
    ? category
    : null;
  const collections = activeCat ? (SHOP_COLLECTIONS[activeCat] ?? []) : [];
  const activeCollection = collections.some(
    (c) => c.id === params.get("collection"),
  )
    ? params.get("collection")!
    : undefined;
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>("newest");
  useEffect(() => {
    setSearch(new URLSearchParams(query).get("q") ?? "");
  }, [query]);
  const q = useDebouncedValue(search.trim());
  const browsing = useShopHistory();
  const grid = useShopCatalogueInfinite("shop", {
    category: activeCat ?? undefined,
    collection: activeCollection,
    q: q || undefined,
    sort,
  });
  const products = useMemo(
    () => grid.data?.pages.flatMap((p) => p.items) ?? [],
    [grid.data],
  );
  const total = grid.data?.pages[0]?.total ?? 0;
  useFeedScrollRestore(products.length > 0);
  const snapshot = useQuery({
    queryKey: ["shop", "discovery-source"],
    queryFn: loadSourcedCatalogue,
    staleTime: Infinity,
  });
  const live = useShopCataloguePage("shop", {
    category: activeCat ?? undefined,
    sort: "newest",
    pageSize: 48,
  });
  const pool = useMemo(() => {
    const map = new Map<string, ShopProduct>();
    for (const p of [...(snapshot.data ?? []), ...(live.data?.items ?? [])]) {
      const key =
        p.sourcing?.platform === "1688" ? `1688-${p.sourcing.productId}` : p.id;
      map.set(key, p);
    }
    return [...map.values()].filter(
      (p) =>
        p.price > 0 &&
        p.image &&
        (!activeCat || p.category === activeCat) &&
        matchesCollection(p, activeCollection) &&
        (!q ||
          `${p.title} ${p.description}`
            .toLowerCase()
            .includes(q.toLowerCase())),
    );
  }, [snapshot.data, live.data, activeCat, activeCollection, q]);
  const lowestQuery = useShopCataloguePage("shop", {
    category: activeCat ?? undefined,
    collection: activeCollection,
    sort: "price-asc",
    pageSize: 3,
  });
  const lowest = useMemo(
    () => lowestQuery.data?.items ?? [],
    [lowestQuery.data],
  );
  const top = useMemo(
    () =>
      discoveryPicks(
        pool.filter((p) => !lowest.some((l) => l.id === p.id)),
        [],
        3,
      ),
    [pool, lowest],
  );
  const suggested = useMemo(
    () => discoveryPicks(pool, browsing.history, 12),
    [pool, browsing.history],
  );
  const recent = useMemo(() => {
    const map = new Map(
      (snapshot.data ?? [])
        .concat(live.data?.items ?? [])
        .map((p) => [p.id, p]),
    );
    return browsing.history
      .flatMap((h) => (map.get(h.id) ? [map.get(h.id)!] : []))
      .slice(0, 6);
  }, [browsing.history, snapshot.data, live.data]);
  function choose(cat: string | null, collection?: string) {
    const next = new URLSearchParams();
    if (cat) next.set("category", cat);
    if (collection) next.set("collection", collection);
    navigate(`/shop${next.size ? "?" + next.toString() : ""}`);
    setSearch("");
    setSort("newest");
  }
  const selection =
    collections.find((c) => c.id === activeCollection)?.label ??
    (activeCat ? categoryLabel(activeCat) : "All discoveries");
  return (
    <PageLayout mainClassName="pt-20">
      <div className="fotizo-shop shop-discovery-page">
        <div className="container-app">
          <header className="discovery-welcome">
            <div>
              <p className="shop-eyebrow">THE FOTIZO SHOP</p>
              <h1>
                Find your <em>next favourite.</em>
              </h1>
              <p>
                A little inspiration. A great find. Something that feels like
                you.
              </p>
            </div>
            <a href="#shop-catalogue" className="discovery-explore">
              Explore the shop <ArrowDown size={17} />
            </a>
          </header>
          <div className="discovery-layout">
            <aside className="discovery-sidebar" aria-label="Shop departments">
              <div className="discovery-sidebar-heading">
                <LayoutGrid size={18} />
                <strong>Categories</strong>
                <span className="discovery-category-hint">
                  Swipe to explore <ArrowRight size={14} />
                </span>
              </div>
              <nav
                className="discovery-category-list"
                id="shop-department-navigation"
                aria-label="Choose a department"
              >
                <button
                  className={!activeCat ? "is-active" : ""}
                  aria-pressed={!activeCat}
                  onClick={() => choose(null)}
                >
                  <LayoutGrid size={17} />
                  All categories <ArrowUpRight size={14} />
                </button>
                {SHOP_CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      className={activeCat === c.id ? "is-active" : ""}
                      aria-pressed={activeCat === c.id}
                      onClick={() => choose(c.id)}
                    >
                      <Icon size={17} />
                      <span>{c.label}</span>
                      {activeCat === c.id && <ArrowRight size={14} />}
                    </button>
                  );
                })}
              </nav>
              <div className="discovery-sidebar-note">
                <Sparkles size={18} />
                <strong>More you. Less searching.</strong>
                <p>Open a few favourites and discover more of what you love.</p>
              </div>
            </aside>
            <div className="discovery-content">
              <div className="discovery-searchbar">
                <Search size={20} aria-hidden="true" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    activeCat
                      ? `Search ${categoryLabel(activeCat).toLowerCase()}…`
                      : "What would you love to find?"
                  }
                  aria-label="Search the shop"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={18} />
                  </button>
                )}
                <button
                  className="discovery-search-button"
                  onClick={() => scrollTo("shop-catalogue")}
                >
                  Search <ArrowRight size={15} />
                </button>
              </div>
              <div className="discovery-breadcrumb">
                <button onClick={() => choose(null)}>Shop</button>
                <span>/</span>
                <span>{selection}</span>
                {activeCat && (
                  <button
                    className="discovery-reset"
                    onClick={() => choose(null)}
                  >
                    <X size={13} />
                    Clear filters
                  </button>
                )}
              </div>
              {collections.length > 0 && (
                <div
                  className="discovery-subcategories"
                  aria-label={`${categoryLabel(activeCat!)} collections`}
                >
                  <button
                    aria-pressed={!activeCollection}
                    onClick={() => choose(activeCat)}
                  >
                    All {categoryLabel(activeCat!).toLowerCase()}
                  </button>
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      aria-pressed={activeCollection === c.id}
                      onClick={() => choose(activeCat, c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              {!q && (
                <div className="discovery-highlights">
                  <Highlight
                    title="Lowest prices"
                    eyebrow="SMALL PRICES. GOOD FINDS."
                    icon={<Tag size={18} />}
                    products={lowest}
                    tone="value"
                    loading={lowestQuery.isLoading}
                    description="Lowest listed prices in this selection."
                    onExplore={() => {
                      setSort("price-asc");
                      scrollTo("shop-catalogue");
                    }}
                  />
                  <Highlight
                    title="Top picks"
                    eyebrow="A LITTLE INSPIRATION"
                    icon={<Sparkles size={18} />}
                    products={top}
                    tone="picks"
                    loading={snapshot.isLoading}
                    description="A fresh mix worth a closer look."
                    onExplore={() => scrollTo("shop-for-you")}
                  />
                </div>
              )}
              {!q && suggested.length > 0 && (
                <section
                  id="shop-for-you"
                  className="discovery-recommendations"
                  aria-labelledby="for-you-heading"
                >
                  <div className="discovery-section-heading">
                    <div>
                      <p className="shop-eyebrow">
                        {browsing.history.length
                          ? "INSPIRED BY YOUR FINDS"
                          : "A GOOD PLACE TO START"}
                      </p>
                      <h2 id="for-you-heading">
                        {browsing.history.length
                          ? "More your kind of thing."
                          : "Discover something you’ll love."}
                      </h2>
                      <p>
                        {browsing.history.length
                          ? "Inspired by products you’ve viewed on this device."
                          : "A fresh mix of styles, home finds and everyday essentials."}
                      </p>
                    </div>
                    <Sparkles className="discovery-heading-icon" size={26} />
                  </div>
                  <div className="discovery-product-track">
                    {suggested.map((p) => (
                      <ShopProductCard key={p.id} product={p} />
                    ))}
                  </div>
                  <div className="discovery-history-controls">
                    <span>
                      <History size={14} />{" "}
                      {browsing.isEnabled
                        ? "Views from the last 30 days · this device"
                        : "Personalisation paused"}
                    </span>
                    <button onClick={browsing.toggle}>
                      {browsing.isEnabled
                        ? "Pause personalisation"
                        : "Enable personalisation"}
                    </button>
                    {browsing.history.length > 0 && (
                      <button onClick={browsing.clear}>
                        Clear viewing history
                      </button>
                    )}
                  </div>
                </section>
              )}
              {recent.length > 0 && !q && (
                <section
                  className="discovery-recent"
                  aria-label="Recently viewed"
                >
                  <div>
                    <History size={17} />
                    <strong>Recently viewed</strong>
                    <span>Pick up where you left off</span>
                  </div>
                  <div className="discovery-recent-items">
                    {recent.map((p) => (
                      <Link key={p.id} href={`/shop/${p.id}`} title={p.title}>
                        <img src={p.image} alt={p.title} loading="lazy" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              <section
                id="shop-catalogue"
                className="discovery-catalogue"
                aria-labelledby="catalogue-heading"
              >
                <div className="discovery-catalogue-heading">
                  <div>
                    <p className="shop-eyebrow">KEEP EXPLORING</p>
                    <h2 id="catalogue-heading">
                      {q ? `Results for “${q}”` : selection}
                    </h2>
                    {!grid.isLoading && (
                      <p>{total.toLocaleString()} products</p>
                    )}
                  </div>
                  <label className="discovery-sort">
                    <SlidersHorizontal size={16} />
                    <span className="sr-only">Sort products</span>
                    <select
                      aria-label="Sort products"
                      value={sort}
                      onChange={(e) => setSort(e.target.value as Sort)}
                    >
                      {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {grid.data?.pages.some((p) => p.liveError) && (
                  <p role="status" className="discovery-status">
                    Some listings could not be loaded.{" "}
                    <button onClick={() => void grid.refetch()}>
                      Try again
                    </button>
                  </p>
                )}
                {grid.isLoading ? (
                  <Loading label="Finding your next favourite…" />
                ) : grid.isError ? (
                  <ErrorState label="The shop could not be loaded. Please try again." />
                ) : !products.length ? (
                  <div className="discovery-empty">
                    <Search size={30} />
                    <h3>No finds here just yet.</h3>
                    <p>
                      Try a different search or explore the whole department.
                    </p>
                    <button onClick={() => choose(activeCat)}>
                      Reset this selection <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="discovery-product-grid">
                      {products.map((p) => (
                        <ShopProductCard key={p.id} product={p} />
                      ))}
                    </div>
                    <LoadMoreSentinel
                      hasMore={Boolean(grid.hasNextPage)}
                      loading={grid.isFetchingNextPage}
                      error={grid.isFetchNextPageError}
                      onLoadMore={() => void grid.fetchNextPage()}
                      endLabel={
                        total > 48
                          ? "You’ve seen everything in this selection."
                          : undefined
                      }
                    />
                  </>
                )}
              </section>
              <p className="discovery-footer-note">
                Imported prices are estimates. Confirm product options, final
                pricing and delivery before ordering.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
function Highlight({
  title,
  eyebrow,
  icon,
  products,
  tone,
  description,
  loading,
  onExplore,
}: {
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  products: ShopProduct[];
  tone: string;
  description: string;
  loading: boolean;
  onExplore: () => void;
}) {
  return (
    <section
      className={`discovery-highlight discovery-highlight-${tone}`}
      aria-label={title}
    >
      <div className="discovery-highlight-heading">
        <div>
          <p>{eyebrow}</p>
          <h2>
            {icon}
            {title}
          </h2>
        </div>
        <button
          onClick={onExplore}
          aria-label={`Explore ${title.toLowerCase()}`}
        >
          <ArrowUpRight size={21} />
        </button>
      </div>
      <div className="discovery-mini-products">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/shop/${p.id}`}
            className="discovery-mini-product"
          >
            <div>
              <img src={p.image} alt={p.title} loading="lazy" />
            </div>
            <Price amount={p.price} />
            <span>{p.title}</span>
          </Link>
        ))}
      </div>
      {!products.length && (
        <p className="discovery-highlight-empty">
          {loading ? "Finding good things…" : "More finds are on their way."}
        </p>
      )}
      <p className="discovery-highlight-caption">
        {description}
        {products.some((p) => p.requiresPublication) &&
          " Prices are estimates; delivery extra."}
      </p>
    </section>
  );
}
