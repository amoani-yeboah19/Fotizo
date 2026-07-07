import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play, TrendingUp, ShieldCheck, BadgeCheck, Globe, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HeroBackground } from "@/features/home/components/HeroBackground";

const HERO_PHOTO_MOBILE = "/images/hero-team-mobile.webp";
const HERO_PHOTO_ALT =
  "The FOTIZO community — entrepreneurs, sellers, artisans and freelancers across Ghana, the UK and the US.";

// Rotating headline phrases — each completes "The Smarter Way to … Online".
const ROTATING_PHRASES = ["Run Your Business", "Grow Your Sales", "Hire Top Talent", "Shop the World"];

const TRENDING = [
  { label: "Logo Design", href: "/services" },
  { label: "Web Development", href: "/services" },
  { label: "Fashion", href: "/products" },
  { label: "Home & Living", href: "/products" },
  { label: "AI Services", href: "/services" },
];

// Honest trust promises — no invented usage metrics; we're a startup.
const PROMISES = [
  { icon: ShieldCheck, title: "Secure Payments", sub: "Protected checkout on every order" },
  { icon: BadgeCheck, title: "Verified Sellers", sub: "Every professional is vetted" },
  { icon: Globe, title: "3 Countries", sub: "Ghana, the UK & the USA" },
  { icon: Heart, title: "Real Support", sub: "Humans, not bots" },
];

// The rotating middle line of the headline. Fixed height so the swap never
// shifts the layout; an orange flourish underlines the active phrase.
function RotatingPhrase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % ROTATING_PHRASES.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="relative block h-[1.15em] overflow-visible">
      <AnimatePresence mode="wait">
        <motion.span
          key={ROTATING_PHRASES[index]}
          initial={{ y: "0.6em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-0.5em", opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-0 text-primary whitespace-nowrap"
        >
          {ROTATING_PHRASES[index]}
          <svg
            viewBox="0 0 200 12"
            className="absolute -bottom-1 left-0 w-[70%] max-w-[240px]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M2 9 Q50 2, 100 7 T198 5" stroke="#FF6A00" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// Eyebrow, headline, paragraph, CTAs — the left-hand pitch. Shown on every device.
function HeroCopy() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center gap-2 bg-[#08275B]/8 border border-[#08275B]/15 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-primary w-fit mb-4 sm:mb-5 whitespace-nowrap"
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6A00] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF6A00]" />
        </span>
        All-in-One Platform · Ghana · UK · USA
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="text-[1.85rem] sm:text-[2rem] md:text-[2.4rem] lg:text-[3.1rem] xl:text-[3.7rem] font-extrabold tracking-tight leading-[1.12] text-foreground"
      >
        The Smarter Way to
        <RotatingPhrase />
        Online
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
        className="mt-5 sm:mt-7 flex flex-nowrap items-center gap-2"
      >
        {/* primary: gradient pill, lifts on hover, arrow slides */}
        <Link href="/signup">
          <Button className="group gap-1.5 sm:gap-2 rounded-full px-4 sm:px-5 h-11 text-sm font-semibold text-white bg-gradient-to-r from-[#08275B] to-[#0d3a85] shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 hover:from-[#08275B] hover:to-[#0f43a0] transition-all duration-300">
            Get Started Free
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Button>
        </Link>

        {/* secondary: glass pill with a pulsing orange play badge — modern media-button pattern */}
        <Button
          type="button"
          className="group gap-2 sm:gap-2.5 rounded-full pl-1.5 pr-4 sm:pr-5 h-11 text-sm font-semibold bg-white/90 backdrop-blur-sm border border-border text-foreground shadow-sm hover:border-[#FF6A00]/50 hover:bg-[#FF6A00]/5 hover:text-foreground hover:-translate-y-0.5 transition-all duration-300"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/40 transition-transform duration-300 group-hover:scale-105">
            {/* sonar ripple radiating out of the badge */}
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[#FF6A00]/40"
              animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <Play className="relative w-3.5 h-3.5 fill-current translate-x-[1px]" aria-hidden="true" />
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
      {/* community line — honest, no invented ratings or counts */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2 shrink-0" aria-hidden="true">
          {[
            { letter: "K", tint: "bg-[#08275B] text-white" },
            { letter: "A", tint: "bg-[#FF6A00] text-white" },
            { letter: "S", tint: "bg-[#0d3a85] text-white" },
            { letter: "D", tint: "bg-[#FF8B3D] text-white" },
          ].map(({ letter, tint }) => (
            <span
              key={letter}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold ${tint}`}
            >
              {letter}
            </span>
          ))}
        </div>
        <p className="flex-1 min-w-0 text-xs text-muted-foreground leading-snug">
          Join a <span className="font-semibold text-foreground">growing community</span> of buyers
          &amp; sellers across <span className="font-semibold text-foreground">Ghana, the UK &amp; the USA</span>
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
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

// Trust-promise bar beneath the hero — commitments we can stand behind today,
// not usage metrics we haven't earned yet.
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
        Built for buyers and sellers across three continents
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8">
        {PROMISES.map(({ icon: Icon, title, sub }, i) => (
          <div
            key={title}
            className={`flex flex-col items-center text-center px-4 ${i > 0 ? "md:border-l md:border-border/60" : ""}`}
          >
            <div className="flex items-center gap-2 text-primary">
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-lg lg:text-xl font-extrabold text-foreground">{title}</span>
            </div>
            <span className="text-sm text-muted-foreground mt-1.5">{sub}</span>
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
