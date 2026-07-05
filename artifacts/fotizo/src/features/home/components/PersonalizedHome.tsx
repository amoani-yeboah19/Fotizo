import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, ArrowRight, LayoutDashboard, Package, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/common/SectionHeader";
import { HeroBackground } from "@/features/home/components/HeroBackground";
import { Categories } from "@/features/home/components/Categories";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { ServiceCard } from "@/features/artisans/components/ServiceCard";
import { useProducts } from "@/features/marketplace/hooks";
import { useServices } from "@/features/artisans/hooks";
import { useAuth } from "@/contexts/AuthContext";

// The signed-in home: a personal greeting + recommendations, shown at "/" instead
// of the marketing landing page once a user is authenticated.
export function PersonalizedHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const { data: products = [] } = useProducts();
  const { data: services = [] } = useServices();

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const dashboardHref = user ? `/dashboard/${user.role}` : "/dashboard/buyer";

  const recommended = products.slice(0, 8);
  const topServices = [...services].sort((a, b) => b.rating - a.rating).slice(0, 6);

  const search = () => {
    const q = query.trim();
    setLocation(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <>
      {/* ── Greeting band ── */}
      <section className="relative overflow-hidden bg-white border-b border-border">
        <HeroBackground />
        <div className="relative z-10 container-app pt-28 lg:pt-32 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl"
          >
            <p className="text-sm font-semibold text-primary mb-2">Welcome back 👋</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Hi {firstName}, what are you looking for today?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Pick up where you left off — or discover something new on Fotizo.
            </p>

            {/* Search */}
            <div className="mt-6 flex items-stretch bg-white rounded-xl shadow-sm border border-border overflow-hidden max-w-xl">
              <div className="flex-1 flex items-center px-4">
                <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-2" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="Search products, services, professionals…"
                  aria-label="Search Fotizo"
                  className="w-full bg-transparent border-none outline-none text-sm py-3 placeholder:text-muted-foreground"
                />
              </div>
              <button
                onClick={search}
                className="bg-primary hover:bg-primary/90 text-white px-5 text-sm font-semibold transition-colors"
              >
                Search
              </button>
            </div>

            {/* Quick actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/products">
                <Button variant="outline" className="gap-2 rounded-full h-10">
                  <Package className="w-4 h-4" aria-hidden="true" /> Browse products
                </Button>
              </Link>
              <Link href="/services">
                <Button variant="outline" className="gap-2 rounded-full h-10">
                  <Briefcase className="w-4 h-4" aria-hidden="true" /> Explore services
                </Button>
              </Link>
              <Link href={dashboardHref}>
                <Button variant="ghost" className="gap-2 rounded-full h-10">
                  <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> Your dashboard
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Recommended products ── */}
      <section className="py-14 bg-background">
        <div className="container-app">
          <SectionHeader
            title="Based on what you might be looking for"
            subtitle="Products we think you'll like."
            action={
              <Link href="/products" className="hidden md:flex items-center text-primary font-medium hover:underline">
                View all <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommended.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Top services ── */}
      <section className="py-14 bg-muted/30">
        <div className="container-app">
          <SectionHeader
            title="Top-rated services for you"
            subtitle="Hire trusted professionals."
            action={
              <Link href="/services" className="hidden md:flex items-center text-primary font-medium hover:underline">
                View all <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Explore categories ── */}
      <Categories />
    </>
  );
}
