import { useSearch } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { CatalogueBrowser } from "@/features/marketplace/components/CatalogueBrowser";
import { ShopProductCard } from "../components/ShopProductCard";
import { ChinaMarketDialog } from "../components/ChinaMarketDialog";
import { toShopProduct } from "../services/shop.service";
export default function ShopPage() {
  const query = useSearch();
  const category = new URLSearchParams(query).get("category") ?? "";
  return (
    <PageLayout mainClassName="pt-20">
      <ChinaMarketDialog />
      <header className="bg-gradient-to-r from-[#08275B] via-[#0a2f6e] to-[#FF6A00] text-white">
        <div className="container-app py-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-widest">
            Fotizo Shop
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            Explore imported products
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Browse published listings by department, price and availability.
          </p>
        </div>
      </header>
      <div className="container-app py-8">
        <CatalogueBrowser
          channel="shop"
          initialCategory={category}
          renderProduct={(p) => <ShopProductCard product={toShopProduct(p)} />}
        />
      </div>
    </PageLayout>
  );
}
