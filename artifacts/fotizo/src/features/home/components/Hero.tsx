import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, ShoppingCart, Briefcase, BarChart3, Users, ShoppingBag, Globe, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const HERO_PHOTO_MOBILE = "/images/hero-team-mobile.webp";
const HERO_PHOTO_ALT =
  "The FOTIZO community — entrepreneurs, sellers, artisans and freelancers across Ghana, the UK and the US.";

const FEATURES = [
  { icon: ShoppingCart, title: "Sell Everywhere", desc: "Reach customers across multiple channels." },
  { icon: Briefcase, title: "Manage Easily", desc: "Streamline operations and save valuable time." },
  { icon: BarChart3, title: "Grow Smarter", desc: "Gain insights and scale your business faster." },
];

const STATS = [
  { icon: Users, value: "25,000+", label: "Active Businesses" },
  { icon: ShoppingBag, value: "1.2M+", label: "Products Sold" },
  { icon: Globe, value: "150+", label: "Countries Reached" },
  { icon: Heart, value: "98%", label: "Customer Satisfaction" },
];

// Eyebrow, headline, paragraph, CTAs. The paragraph is hidden on phones (where
// the copy overlays the image's white zone) and returns from md up.
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
        className="mt-7 flex flex-wrap items-center gap-3"
      >
        <Link href="/signup">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg px-6 h-12 text-sm font-semibold shadow-md shadow-primary/25">
            Get Started Free
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-lg px-6 h-12 text-sm font-semibold border-border bg-white/90 backdrop-blur-sm hover:bg-muted text-foreground"
        >
          <PlayCircle className="w-4 h-4" aria-hidden="true" />
          Watch Demo
        </Button>
      </motion.div>
    </>
  );
}

// The three "why Fotizo" blurbs (Sell Everywhere / Manage Easily / Grow Smarter).
function HeroFeatures() {
  return (
    <motion.ul
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.36 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4"
    >
      {FEATURES.map(({ icon: Icon, title, desc }) => (
        <li key={title} className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{desc}</p>
          </div>
        </li>
      ))}
    </motion.ul>
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
      className="container-app pt-4 pb-16 lg:pt-8 lg:pb-20"
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
      {/* ── md+ : two columns — copy left, image right (never overlap at any width) ── */}
      <div className="hidden md:block">
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
      <div className="md:hidden pt-20">
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
          <div className="absolute inset-x-0 top-0 px-6 pt-6">
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
