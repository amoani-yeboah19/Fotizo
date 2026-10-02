import { Link } from "wouter";
import { ArrowUpRight, Store, Tag } from "lucide-react";
import { useCataloguePage } from "../hooks/useCatalogue";
import type { CatalogueProduct } from "@workspace/api-client-react";

export function groupSellerListings(products: CatalogueProduct[]) {
  const sellers = new Map<
    string,
    { id: string; name: string; products: CatalogueProduct[] }
  >();
  for (const product of products) {
    if (
      !product.sellerId ||
      !product.seller?.trim() ||
      product.channel !== "marketplace" ||
      product.status !== "active"
    )
      continue;
    const seller = sellers.get(product.sellerId) ?? {
      id: product.sellerId,
      name: product.seller,
      products: [],
    };
    if (!seller.products.some((p) => p.id === product.id))
      seller.products.push(product);
    sellers.set(product.sellerId, seller);
  }
  return [...sellers.values()].slice(0, 6);
}

export function SellerSpotlight() {
  const recent = useCataloguePage("marketplace", {
    sort: "newest",
    pageSize: 48,
  });
  const offers = useCataloguePage("marketplace", {
    discounted: true,
    inStock: true,
    sort: "discount",
    pageSize: 48,
  });
  const sellers = groupSellerListings(recent.data?.items ?? []);
  const deals = groupSellerListings(
    (offers.data?.items ?? []).filter(
      (p) => p.inStock && p.originalPrice != null && p.originalPrice > p.price,
    ),
  );
  if (!sellers.length && !deals.length) return null;
  return (
    <section
      className="mb-10 space-y-8"
      aria-label="Discover marketplace sellers"
    >
      {[
        {
          title: "Meet the sellers",
          subtitle: "Discover shops behind the latest local listings.",
          entries: sellers,
          isDeal: false,
        },
        {
          title: "Deals from local sellers",
          subtitle:
            "Explore products with a lower price than their listed original price.",
          entries: deals,
          isDeal: true,
        },
      ].map(({ title, subtitle, entries, isDeal }) => {
        if (!entries.length) return null;
        return (
          <div key={title}>
            <p className="catalogue-eyebrow">
              {isDeal
                ? "A little more for your money"
                : "Shop from real people"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((seller) => (
                <article
                  key={seller.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div
                    className="grid grid-cols-3 gap-1 bg-muted p-3"
                    aria-hidden="true"
                  >
                    {seller.products.slice(0, 3).map((product) => (
                      <div
                        key={product.id}
                        className="aspect-square overflow-hidden rounded-lg bg-background"
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Store className="mx-auto h-full w-8 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      {isDeal ? (
                        <Tag size={14} aria-hidden="true" />
                      ) : (
                        <Store size={14} aria-hidden="true" />
                      )}
                      {isDeal ? "Discounted products" : "Local seller"}
                    </div>
                    <h3 className="text-lg font-semibold text-primary">
                      {seller.name}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {seller.products[0].title}
                    </p>
                    <Link
                      href={`/products?sellerId=${encodeURIComponent(seller.id)}${isDeal ? "&deals=true" : ""}#local-listings`}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    >
                      {isDeal
                        ? `See deals from ${seller.name}`
                        : `Visit ${seller.name}’s shop`}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
