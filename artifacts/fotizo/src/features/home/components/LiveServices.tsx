import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ArrowRight, Star } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Price } from "@/components/common/Price";
import { useServices } from "@/features/artisans/hooks";
import type { Service } from "@/types";

const CARD_W = 280;
const GAP = 20;

// Services have no cover image, so we back each big card with a category-matched
// photo and overlay the real listing data (title, provider, price, availability).
const CAT_IMG: { match: RegExp; id: string }[] = [
  { match: /dev|tech|program|web|software|code|app/i, id: "photo-1461749280684-dccba630e2f6" },
  { match: /design|graphic|brand|logo|ui|ux/i, id: "photo-1563986768494-4dee2763ff3f" },
  { match: /photo/i, id: "photo-1502920917128-1aa500764cbd" },
  { match: /video|film|motion|edit/i, id: "photo-1574717024653-61fd2cf4d44d" },
  { match: /market|social|seo|ad\b|ads/i, id: "photo-1611926653458-09294b3142bf" },
  { match: /writ|content|copy|translat/i, id: "photo-1481627834876-b7833e8f5570" },
  { match: /fashion|tailor|cloth|sew/i, id: "photo-1558618666-fcd25c85cd64" },
  { match: /home|interior|repair|clean/i, id: "photo-1555041469-a586c61ea9bc" },
  { match: /consult|business|finance|account|legal/i, id: "photo-1600880292203-757bb62b4baf" },
];
const DEFAULT_IMG = "photo-1600880292203-757bb62b4baf";

const categoryImage = (category: string) => {
  const hit = CAT_IMG.find((c) => c.match.test(category));
  return `https://images.unsplash.com/${hit?.id ?? DEFAULT_IMG}?w=600&q=80&auto=format&fit=crop`;
};

const startingPrice = (s: Service) =>
  s.packages?.length ? Math.min(...s.packages.map((p) => p.price)) : s.hourlyRate;

export function LiveServices() {
  const { data: services = [] } = useServices();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const check = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => el.removeEventListener("scroll", check);
  }, [services.length]);

  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({ left: (dir === "right" ? 1 : -1) * (CARD_W + GAP) * 2, behavior: "smooth" });
  };

  // Nothing live yet → don't render an empty section.
  if (services.length === 0) return null;

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="container-app">
        <SectionHeader
          title="Services on Fotizo"
          subtitle="Hire real, vetted pros for your next project — every listing here is live."
          action={
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button
                aria-label="Scroll services left"
                onClick={() => scroll("left")}
                disabled={!canLeft}
                className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                aria-label="Scroll services right"
                onClick={() => scroll("right")}
                disabled={!canRight}
                className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          }
        />
      </div>

      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-4 px-4 lg:px-8 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {services.map((s) => (
          <Link key={s.id} href={`/services/${s.id}`}>
            <div
              className="group relative shrink-0 snap-start cursor-pointer overflow-hidden rounded-3xl shadow-md hover:shadow-xl transition-shadow duration-300"
              style={{ width: CARD_W, height: 360 }}
            >
              <img
                loading="lazy"
                decoding="async"
                src={categoryImage(s.category)}
                alt={s.category}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, #08275Bee 0%, #08275B99 45%, transparent 78%)" }}
              />

              {/* availability chip */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
                <span className="text-white text-[10px] font-semibold uppercase tracking-wider">
                  {s.availability}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-2">
                <span className="text-white/70 text-xs font-medium">{s.category}</span>
                <h3 className="text-white text-lg font-bold leading-tight line-clamp-2">{s.title}</h3>
                <div className="flex items-center gap-2">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={s.avatar}
                    alt={s.provider}
                    className="w-6 h-6 rounded-full object-cover border border-white/40"
                  />
                  <span className="text-white/90 text-sm font-medium truncate">{s.provider}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-white text-sm font-semibold flex items-center gap-1">
                    From <Price amount={startingPrice(s)} className="text-white text-sm font-semibold" />
                  </span>
                  {s.reviewCount > 0 ? (
                    <span className="flex items-center gap-1 text-white text-xs font-medium">
                      <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> {s.rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wide bg-white/15 border border-white/25 rounded-full px-2 py-0.5">
                      New
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* Browse-all CTA tile keeps the track intentional while listings are few */}
        <Link href="/services">
          <div
            className="group shrink-0 snap-start cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-primary/30 bg-primary/[0.03] flex flex-col items-center justify-center gap-3 hover:bg-primary/5 transition-colors"
            style={{ width: CARD_W, height: 360 }}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <ArrowRight className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <span className="text-primary font-semibold">Browse all services</span>
            <span className="text-muted-foreground text-sm">See every pro on Fotizo</span>
          </div>
        </Link>

        <div className="shrink-0 w-4" />
      </div>
    </section>
  );
}
