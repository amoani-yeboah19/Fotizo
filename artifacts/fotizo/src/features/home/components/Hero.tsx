import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, TrendingUp, Users, ShoppingBag, Globe, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HeroBackground } from "@/features/home/components/HeroBackground";

const HERO_PHOTO_MOBILE = "/images/hero-team-mobile.webp";
const HERO_PHOTO_ALT =
  "The FOTIZO community — entrepreneurs, sellers, artisans and freelancers across Ghana, the UK and the US.";

const TRENDING = [
  { label: "Logo Design", href: "/services" },
  { label: "Web Development", href: "/services" },
  { label: "Fashion", href: "/products" },
  { label: "Home & Living", href: "/products" },
  { label: "AI Services", href: "/services" },
];

const STATS = [
  { icon: Users, value: "25,000+", label: "Active Businesses" },
  { icon: ShoppingBag, value: "1.2M+", label: "Products Sold" },
  { icon: Globe, value: "150+", label: "Countries Reached" },
  { icon: Heart, value: "98%", label: "Customer Satisfaction" },
];

// Eyebrow, headline, paragraph, CTAs — the left-hand pitch. Shown on every device.
function HeroCopy() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center gap-2 bg-[#08275B]/8 border border-[#08275B]/15 rounded-full px-4 py-1.5 text-sm font-semibold text-primary w-fit mb-5"
      >
        All-in-One Platform
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="text-[2rem] md:text-[2.4rem] lg:text-[3.1rem] xl:text-[3.7rem] font-extrabold tracking-tight leading-[1.08] text-foreground"
      >
        The Smarter Way to Run Your Business Online
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="hidden md:block mt-6 text-lg text-muted-foreground leading-relaxed max-w-[480px]"
      >
        Fotizo gives you everything you need to build, manage, and grow your online business —
        effortlessly.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.26 }}
        className="mt-7 flex flex-nowrap items-center gap-2"
      >
        <Link href="/signup">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg px-4 h-11 text-sm font-semibold shadow-md shadow-primary/25">
            Get Started Free
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Link>
        <Button
          type="button"
          className="gap-2 rounded-lg px-4 h-11 text-sm font-semibold bg-[#FF6A00] text-white hover:bg-[#FF6A00]/90 shadow-md shadow-[#FF6A00]/30"
        >
          <span className="relative inline-flex items-center justify-center">
            {/* sonar ripple radiating out of the play icon */}
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-white/50"
              animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
            {/* gentle pulse on the icon itself */}
            <motion.span
              className="relative inline-flex"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <PlayCircle className="w-4 h-4" aria-hidden="true" />
            </motion.span>
          </span>
          Watch Demo
        </Button>
      </motion.div>
    </>
  );
}

// Catchy strip under the CTAs: a punchy one-liner + trending-search chips.
function HeroFeatures() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.36 }}
    >
      <p className="text-sm font-medium text-muted-foreground">
        One marketplace. <span className="text-primary font-semibold">Endless possibilities</span> —
        shop, hire &amp; grow across <span className="text-[#FF6A00] font-semibold">3 continents</span>.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <TrendingUp className="w-3.5 h-3.5 text-[#FF6A00]" aria-hidden="true" /> Trending
        </span>
        {TRENDING.map((t) => (
          <Link key={t.label} href={t.href}>
            <span className="inline-block rounded-full border border-border bg-white/80 px-3.5 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
              {t.label}
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

// The "trusted by" stats bar shown beneath the hero across all breakpoints.
function HeroStats() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative z-10 container-app pt-4 pb-16 lg:pt-8 lg:pb-20"
    >
      <p className="text-center text-sm text-muted-foreground mb-8">
        Trusted by thousands of businesses worldwide
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8">
        {STATS.map(({ icon: Icon, value, label }, i) => (
          <div
            key={label}
            className={`flex flex-col items-center text-center px-4 ${i > 0 ? "md:border-l md:border-border/60" : ""}`}
          >
            <div className="flex items-center gap-2 text-primary">
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-2xl lg:text-3xl font-extrabold text-foreground">{value}</span>
            </div>
            <span className="text-sm text-muted-foreground mt-1.5">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative bg-white overflow-hidden">
      <HeroBackground />

      {/* ── md+ : two columns — copy left, image right (never overlap at any width) ── */}
      <div className="relative z-10 hidden md:block">
        <div className="container-app pt-28 lg:pt-32 pb-6">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
            <div className="max-w-xl">
              <HeroCopy />
              <div className="mt-10">
                <HeroFeatures />
              </div>
            </div>
            <div>
              <img
                src={HERO_PHOTO_MOBILE}
                alt={HERO_PHOTO_ALT}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="w-full aspect-[4/5] object-cover object-bottom rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── < md : copy overlaid on the image's white top zone; features below ── */}
      <div className="relative z-10 md:hidden pt-20">
        <div className="relative max-w-[460px] mx-auto">
          <img
            src={HERO_PHOTO_MOBILE}
            alt={HERO_PHOTO_ALT}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-auto"
          />
          {/* soft top scrim — safety net; fades out before the people */}
          <div className="absolute inset-0 bg-gradient-to-b from-white from-8% via-white/70 via-40% to-transparent to-54%" />
          <div className="absolute inset-x-0 top-0 px-5 pt-6">
            <HeroCopy />
          </div>
        </div>
        <div className="container-app pt-8">
          <HeroFeatures />
        </div>
      </div>

      {/* ── Trusted-by stats bar (all breakpoints) ── */}
      <HeroStats />
    </section>
  );
}
