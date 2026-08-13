import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SHOWCASE_CARDS } from "@/features/home/data/serviceShowcase";

const CARD_W = 280;
const GAP = 20;

export function PopularServices() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

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
  }, []);

  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({ left: (dir === "right" ? 1 : -1) * (CARD_W + GAP) * 2, behavior: "smooth" });
  };

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="container-app">
        <SectionHeader
          title="Explore services"
          subtitle="Barbers, tailors, plumbers, caterers and freelancers — tap a trade to see who\u2019s available."
          action={
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button
                aria-label="Scroll popular services left"
                onClick={() => scroll("left")}
                disabled={!canLeft}
                className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                aria-label="Scroll popular services right"
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

      {/* Track bleeds to the edge, like the categories carousel */}
      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-4 px-4 lg:px-8 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {SHOWCASE_CARDS.map((s) => (
          <Link key={s.id} href={s.href}>
            <div
              className="group relative shrink-0 snap-start cursor-pointer overflow-hidden rounded-3xl shadow-md hover:shadow-xl transition-shadow duration-300"
              style={{ width: CARD_W, height: 360 }}
            >
              <img
                loading="lazy"
                decoding="async"
                src={s.image}
                alt={s.label}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to top, ${s.accent}ee 0%, ${s.accent}88 45%, transparent 75%)` }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-1">
                <span className="text-white/70 text-xs font-medium">{s.groupLabel}</span>
                <h3 className="text-white text-lg font-bold leading-tight">{s.label}</h3>
                <div className="flex items-center gap-1 mt-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-white text-xs font-semibold">Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                </div>
              </div>
              <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1">
                <span className="text-white text-[10px] font-semibold uppercase tracking-wider">Book now</span>
              </div>
            </div>
          </Link>
        ))}
        <div className="shrink-0 w-4" />
      </div>
    </section>
  );
}
