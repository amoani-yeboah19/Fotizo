import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=600&q=80&auto=format&fit=crop`;

// Big, image-forward service cards — same treatment as Explore Categories.
const SERVICES = [
  { name: "Logo Design", tagline: "Branding & identity", image: IMG("photo-1626785774573-4b799315345d"), accent: "#0D2A4A" },
  { name: "Website Development", tagline: "Web & apps", image: IMG("photo-1461749280684-dccba630e2f6"), accent: "#1A1A2E" },
  { name: "Video Editing", tagline: "Reels & ads", image: IMG("photo-1574717024653-61fd2cf4d44d"), accent: "#3D1F0D" },
  { name: "Social Media Marketing", tagline: "Grow your reach", image: IMG("photo-1611926653458-09294b3142bf"), accent: "#1E3A5F" },
  { name: "Graphic Design", tagline: "Visuals that sell", image: IMG("photo-1563986768494-4dee2763ff3f"), accent: "#5C2A3A" },
  { name: "Fashion & Tailoring", tagline: "Custom & bespoke", image: IMG("photo-1558618666-fcd25c85cd64"), accent: "#3D2B1F" },
  { name: "Photography", tagline: "Shoots & edits", image: IMG("photo-1502920917128-1aa500764cbd"), accent: "#1A3A2A" },
  { name: "Home Services", tagline: "Repairs & fittings", image: IMG("photo-1581578731548-c64695cc6952"), accent: "#2D4A3E" },
  { name: "Interior Design", tagline: "Style your space", image: IMG("photo-1555041469-a586c61ea9bc"), accent: "#2C1F0E" },
  { name: "Content Writing", tagline: "Words that convert", image: IMG("photo-1481627834876-b7833e8f5570"), accent: "#08275B" },
  { name: "Business Consulting", tagline: "Advice & strategy", image: IMG("photo-1600880292203-757bb62b4baf"), accent: "#1A1A1A" },
];

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
          title="Popular services"
          subtitle="The most in-demand skills and services on Fotizo right now."
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
        {SERVICES.map((s) => (
          <Link key={s.name} href="/services">
            <div
              className="group relative shrink-0 snap-start cursor-pointer overflow-hidden rounded-3xl shadow-md hover:shadow-xl transition-shadow duration-300"
              style={{ width: CARD_W, height: 360 }}
            >
              <img
                loading="lazy"
                decoding="async"
                src={s.image}
                alt={s.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to top, ${s.accent}ee 0%, ${s.accent}88 45%, transparent 75%)` }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-1">
                <span className="text-white/70 text-xs font-medium">{s.tagline}</span>
                <h3 className="text-white text-lg font-bold leading-tight">{s.name}</h3>
                <div className="flex items-center gap-1 mt-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-white text-xs font-semibold">Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                </div>
              </div>
              <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1">
                <span className="text-white text-[10px] font-semibold uppercase tracking-wider">Service</span>
              </div>
            </div>
          </Link>
        ))}
        <div className="shrink-0 w-4" />
      </div>
    </section>
  );
}
