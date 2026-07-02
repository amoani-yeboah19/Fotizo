import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown, ArrowRight, Star, ShieldCheck, Zap, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";

const STATS = [
  { value: "2.4M+", label: "Active Buyers" },
  { value: "180K+", label: "Verified Sellers" },
  { value: "94+", label: "Countries" },
  { value: "£2.1B+", label: "Transacted" },
];

const TRUSTED_LOGOS = [
  "Accenture", "Deloitte", "Goldman Sachs", "KPMG", "McKinsey", "Unilever",
];

const CATEGORIES = [
  "All", "Electronics", "Fashion", "Home & Living", "Services", "Digital",
];

const FLOATING_BADGES = [
  {
    icon: <ShieldCheck className="w-4 h-4 text-green-600" />,
    text: "Verified seller",
    sub: "100% authenticated",
    position: "top-[12%] right-[5%]",
    delay: 0.6,
  },
  {
    icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" />,
    text: "Top rated",
    sub: "4.9 average",
    position: "bottom-[28%] right-[2%]",
    delay: 0.8,
  },
  {
    icon: <Zap className="w-4 h-4 text-accent" />,
    text: "Fast delivery",
    sub: "Ships in 24h",
    position: "bottom-[10%] left-[4%]",
    delay: 1.0,
  },
];

export function Hero() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [, setLocation] = useLocation();

  const handleSearch = () => {
    const cat = activeCategory !== "All" ? `?category=${activeCategory}` : "";
    if (query.trim()) {
      setLocation(`/products${cat}`);
    } else {
      setLocation(`/products${cat}`);
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-white">

      {/* ── Subtle grid background ── */}
      <div
        className="absolute inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#08275B 1px, transparent 1px), linear-gradient(90deg, #08275B 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Navy accent blob — top-right ── */}
      <div className="absolute top-0 right-0 w-[55%] h-[90%] z-0 rounded-bl-[80px] overflow-hidden">
        <div className="absolute inset-0 bg-[#08275B]" />
        {/* subtle dot pattern over navy */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* hero product image fills the navy panel */}
        <img
          src="/images/hero.png"
          alt="Premium marketplace"
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
        />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10 pt-32 pb-20 lg:pt-40 lg:pb-28">
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
          <div className="relative hidden lg:flex items-center justify-center h-full min-h-[600px]">

            {/* Main product image on navy bg */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-[340px] xl:w-[400px] aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
            >
              <img
                src="/images/hero.png"
                alt="Premium marketplace"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#08275B]/50 via-transparent to-transparent" />

              {/* bottom overlay card */}
              <div className="absolute bottom-5 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <img src="/images/avatar-1.png" alt="seller" className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">Sony WH-1000XM5</p>
                    <p className="text-xs text-muted-foreground">by Sony Official · Electronics</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">£348</p>
                    <div className="flex items-center gap-0.5 justify-end mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating badges */}
            {FLOATING_BADGES.map((b) => (
              <motion.div
                key={b.text}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: b.delay }}
                className={`absolute ${b.position} bg-white rounded-2xl px-4 py-3 shadow-xl border border-border/50 flex items-center gap-3`}
              >
                <div className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center shrink-0">
                  {b.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground leading-none">{b.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{b.sub}</p>
                </div>
              </motion.div>
            ))}

            {/* Live activity badge */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="absolute top-[50%] -left-[60px] xl:-left-[80px] bg-[#08275B] text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <div>
                <p className="text-[10px] font-semibold leading-none opacity-80">LIVE</p>
                <p className="text-xs font-bold mt-0.5">847 active</p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>


    </section>
  );
}
