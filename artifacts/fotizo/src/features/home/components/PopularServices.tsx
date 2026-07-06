import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=600&q=80&auto=format&fit=crop`;

const SERVICES = [
  { name: "Logo Design", image: IMG("photo-1626785774573-4b799315345d") },
  { name: "Website Development", image: IMG("photo-1461749280684-dccba630e2f6") },
  { name: "Video Editing", image: IMG("photo-1574717024653-61fd2cf4d44d") },
  { name: "Social Media Marketing", image: IMG("photo-1611926653458-09294b3142bf") },
  { name: "AI Services", image: IMG("photo-1677442136019-21780ecad995") },
  { name: "Fashion & Tailoring", image: IMG("photo-1558618666-fcd25c85cd64") },
  { name: "Photography", image: IMG("photo-1502920917128-1aa500764cbd") },
  { name: "Home Services", image: IMG("photo-1581578731548-c64695cc6952") },
];

const CARD_W = 232;
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
              className="group snap-start shrink-0 w-[232px] rounded-2xl bg-[#08275B] p-4 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-white font-bold text-lg leading-snug min-h-[3.5rem]">{s.name}</h3>
              <div className="mt-3 aspect-square overflow-hidden rounded-xl bg-white/10">
                <img
                  loading="lazy"
                  decoding="async"
                  src={s.image}
                  alt={s.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </Link>
        ))}
        <div className="shrink-0 w-4" />
      </div>
    </section>
  );
}
