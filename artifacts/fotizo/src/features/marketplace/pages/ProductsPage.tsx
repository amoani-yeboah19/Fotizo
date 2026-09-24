import { Link, useSearch } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { ProductCard } from "../components/ProductCard";
import { CatalogueBrowser } from "../components/CatalogueBrowser";
export default function ProductsPage() {
  // Category links (e.g. from the home page) arrive as ?category=<id>.
  const category = new URLSearchParams(useSearch()).get("category") ?? "";
  return (
    <PageLayout mainClassName="container-app py-24 md:py-32">
      <header className="mb-8">
        <h1 className="heading-page text-foreground">Local marketplace</h1>
        <p className="mt-1 text-muted-foreground">
          Products listed by sellers on Fotizo. For imported stock, visit{" "}
          <Link
            href="/shop"
            className="font-semibold text-primary hover:underline"
          >
            Fotizo Shop
          </Link>
          .
        </p>
      </header>
      <CatalogueBrowser
        channel="marketplace"
        initialCategory={category}
        renderProduct={(p) => <ProductCard product={p} />}
      />
    </PageLayout>
  );
}
