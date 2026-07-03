import { motion } from "framer-motion";
import { ArrowRight, Globe, ShieldCheck, Star, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const HERO_PHOTO = "/images/hero-team.webp";
const HERO_PHOTO_ALT =
  "The FOTIZO community — entrepreneurs, sellers, artisans and freelancers across Ghana, the UK and the US.";

const TRUST_BADGES = [
  { icon: ShieldCheck, iconClass: "text-green-600", label: "Secure payments" },
  { icon: Star, iconClass: "text-amber-500 fill-amber-500", label: "4.9/5 rating" },
  { icon: Globe, iconClass: "text-primary", label: "94+ countries" },
  { icon: Users, iconClass: "text-primary", label: "2.4M+ members" },
];

// Left-hand copy: eyebrow, headline, paragraph, CTAs, trust badges. Rendered in
// two places (overlaid on the photo at lg+, stacked above it on mobile) so the
// markup stays DRY across the two responsive layouts.
function HeroContent() {
  return (
    <div className="max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center gap-2 bg-[#08275B]/8 border border-[#08275B]/15 rounded-full px-4 py-1.5 text-sm font-medium text-primary w-fit mb-6"
      >
        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
        Trusted marketplace · Ghana, UK &amp; USA
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="text-[2.75rem] sm:text-[3.6rem] lg:text-[4rem] xl:text-[4.6rem] font-extrabold tracking-tight leading-[1.05] text-foreground"
      >
        Where the world
        <br />
        <span className="text-primary">buys, sells</span>
        <br />
        <span className="relative">
          &amp;&nbsp;
          <span className="relative inline-block">
            <span className="text-accent">grows.</span>
            <svg
              viewBox="0 0 200 12"
              className="absolute -bottom-1 left-0 w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M2 9 Q50 2, 100 7 T198 5" stroke="#FF6A00" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-[460px]"
      >
        One platform to discover premium products, hire trusted professionals, and grow your business —
        across Ghana, the UK and the US.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.26 }}
        className="mt-8 flex flex-wrap items-center gap-3"
      >
        <Link href="/products">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-full px-7 h-12 text-sm font-semibold shadow-md shadow-primary/25">
            Explore Marketplace
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Link>
        <Link href="/signup">
          <Button
            variant="outline"
            className="rounded-full px-7 h-12 text-sm font-semibold border-border bg-white/80 backdrop-blur-sm hover:bg-muted text-foreground"
          >
            Start Selling Free
          </Button>
        </Link>
      </motion.div>

      <motion.ul
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.36 }}
        className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3"
      >
        {TRUST_BADGES.map(({ icon: Icon, iconClass, label }) => (
          <li key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} aria-hidden="true" />
            {label}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative bg-white overflow-hidden">
      {/* ── lg+ : full-bleed photo at its native ratio (people stay right, as composed) ── */}
      <div className="relative hidden lg:block w-full aspect-[1717/916] min-h-[620px] max-h-[90vh]">
        <img
          src={HERO_PHOTO}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* white scrim on the left keeps the headline crisp over the photo */}
        <div className="absolute inset-0 bg-gradient-to-r from-white from-15% via-white/55 via-42% to-transparent to-65%" />
        <div className="absolute inset-0">
          <div className="container-app h-full flex items-center">
            <HeroContent />
          </div>
        </div>
      </div>

      {/* ── < lg : content stacked above a cropped photo (all faces preserved) ── */}
      <div className="lg:hidden container-app pt-28 pb-16">
        <HeroContent />
        <motion.img
          src={HERO_PHOTO}
          alt={HERO_PHOTO_ALT}
          loading="eager"
          decoding="async"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42 }}
          className="mt-10 w-full aspect-[4/3] sm:aspect-[16/10] object-cover object-right rounded-2xl border border-border/60 shadow-lg"
        />
      </div>
    </section>
  );
}
