import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { HeroBackground } from "@/features/home/components/HeroBackground";
import { HeroImagePanel } from "@/features/home/components/HeroImagePanel";

const STATS = [
  { value: "2.4M+", label: "Active Buyers" },
  { value: "180K+", label: "Verified Sellers" },
  { value: "94+", label: "Countries" },
  { value: "£2.1B+", label: "Transacted" },
];

const CATEGORIES = ["All", "Electronics", "Fashion", "Home & Living", "Services", "Digital"];

export function Hero() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [, setLocation] = useLocation();

  const handleSearch = () => {
    const cat = activeCategory !== "All" ? `?category=${activeCategory}` : "";
    setLocation(`/products${cat}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-white">
      <HeroBackground />

      <div className="container-app relative z-10 pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-0 items-center min-h-[calc(100vh-160px)]">
          {/* ── LEFT: Copy ── */}
          <div className="flex flex-col justify-center pr-0 lg:pr-12 xl:pr-20">
            {/* eyebrow pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-[#08275B]/8 border border-[#08275B]/15 rounded-full px-4 py-1.5 text-sm font-medium text-primary w-fit mb-6"
            >
              <Globe className="w-3.5 h-3.5" />
              Global Marketplace · UK, USA &amp; Ghana
            </motion.div>

            {/* headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-[3.2rem] sm:text-[3.8rem] lg:text-[4.2rem] xl:text-[4.8rem] font-extrabold tracking-tight leading-[1.05] text-foreground"
            >
              Where the world
              <br />
              <span className="text-primary">buys, sells</span>
              <br />
              <span className="relative">
                &amp;&nbsp;
                <span className="relative inline-block">
                  <span className="text-accent">grows.</span>
                  {/* underline flourish */}
                  <svg
                    viewBox="0 0 200 12"
                    className="absolute -bottom-1 left-0 w-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 9 Q50 2, 100 7 T198 5"
                      stroke="#FF6A00"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
            </motion.h1>

            {/* sub */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-[440px]"
            >
              One platform to discover premium products, hire world-class professionals, and scale your business — across borders.
            </motion.p>

            {/* ── Search bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26 }}
              className="mt-9"
            >
              {/* category chips */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      activeCategory === cat
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* input row */}
              <div className="flex items-stretch bg-white rounded-2xl shadow-[0_4px_32px_rgba(8,39,91,0.12)] border border-border/60 overflow-hidden">
                <div className="flex-1 flex items-center px-5">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search products, services, professionals…"
                    aria-label="Search products, services and professionals"
                    data-testid="input-hero-search"
                    className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-4"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  data-testid="button-hero-search"
                  className="bg-primary hover:bg-primary/90 text-white px-8 font-semibold text-sm tracking-wide transition-colors flex items-center gap-2 shrink-0"
                >
                  Search <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.34 }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <Link href="/products">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-7 h-12 text-sm font-semibold shadow-md shadow-primary/25">
                  Explore Marketplace
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" className="rounded-full px-7 h-12 text-sm font-semibold border-border hover:bg-muted text-foreground">
                  Start Selling Free
                </Button>
              </Link>
            </motion.div>

            {/* ── Stats row ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.44 }}
              className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-[480px]"
            >
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-2xl font-extrabold text-primary leading-none">{s.value}</span>
                  <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT: Image panel ── */}
          <HeroImagePanel />
        </div>
      </div>
    </section>
  );
}
