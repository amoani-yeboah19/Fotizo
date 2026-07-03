import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const CATEGORIES = [
  {
    id: "c1",
    name: "Electronics",
    count: "12,483 products",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80&auto=format&fit=crop",
    accent: "#1E3A5F",
  },
  {
    id: "c2",
    name: "Fashion",
    count: "8,921 products",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop",
    accent: "#3D2B1F",
  },
  {
    id: "c3",
    name: "Home & Living",
    count: "6,540 products",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80&auto=format&fit=crop",
    accent: "#2D4A3E",
  },
  {
    id: "c4",
    name: "Beauty",
    count: "4,312 products",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80&auto=format&fit=crop",
    accent: "#5C2A3A",
  },
  {
    id: "c5",
    name: "Sports",
    count: "3,891 products",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80&auto=format&fit=crop",
    accent: "#1A3A2A",
  },
  {
    id: "c6",
    name: "Books",
    count: "2,540 products",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80&auto=format&fit=crop",
    accent: "#2C1F0E",
  },
  {
    id: "c7",
    name: "Freelance Services",
    count: "9,201 services",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80&auto=format&fit=crop",
    accent: "#0D2A4A",
  },
  {
    id: "c8",
    name: "Digital Products",
    count: "5,630 items",
    image: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=600&q=80&auto=format&fit=crop",
    accent: "#1A1A2E",
  },
  {
    id: "c9",
    name: "Food & Gourmet",
    count: "1,820 products",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop",
    accent: "#3D1F0D",
  },
  {
    id: "c10",
    name: "Auto Parts",
    count: "3,140 products",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80&auto=format&fit=crop",
    accent: "#1A1A1A",
  },
];

export function Categories() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const CARD_W = 280;
  const GAP = 20;

  const checkScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, []);

  const startAuto = () => {
    autoRef.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: CARD_W + GAP, behavior: "smooth" });
      }
    }, 3200);
  };

  const stopAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current);
  };

  useEffect(() => {
    startAuto();
    return () => stopAuto();
  }, []);

  const scroll = (dir: "left" | "right") => {
    stopAuto();
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? (CARD_W + GAP) * 2 : -(CARD_W + GAP) * 2, behavior: "smooth" });
    startAuto();
  };

  return (
    <section className="py-20 bg-[#F7F8FB] overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="text-xs font-semibold text-primary uppercase tracking-widest mb-2"
            >
              Browse by category
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="text-3xl font-extrabold text-foreground tracking-tight"
            >
              Explore Categories
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="text-muted-foreground mt-1.5"
            >
              Find exactly what you need from our global catalog.
            </motion.p>
          </div>

          {/* Arrow controls */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable track — bleeds to edge */}
      <div
        ref={trackRef}
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-4 px-4 lg:px-8 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {CATEGORIES.map((cat, i) => (
          <Link
            key={cat.id}
            href={`/products?category=${encodeURIComponent(cat.name)}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.4) }}
              className="group relative shrink-0 snap-start cursor-pointer overflow-hidden rounded-3xl shadow-md hover:shadow-xl transition-shadow duration-300"
              style={{ width: CARD_W, height: 360 }}
            >
              {/* image */}
              <img
                src={cat.image}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />

              {/* gradient overlay */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(to top, ${cat.accent}ee 0%, ${cat.accent}88 45%, transparent 75%)`,
                }}
              />

              {/* content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-1">
                <span className="text-white/70 text-xs font-medium">{cat.count}</span>
                <h3 className="text-white text-lg font-bold leading-tight">{cat.name}</h3>
                <div className="flex items-center gap-1 mt-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-white text-xs font-semibold">Shop now</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              {/* top tag */}
              <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1">
                <span className="text-white text-[10px] font-semibold uppercase tracking-wider">
                  {cat.name.split(" ")[0]}
                </span>
              </div>
            </motion.div>
          </Link>
        ))}

        {/* End spacer */}
        <div className="shrink-0 w-4" />
      </div>

      {/* hide scrollbar for webkit */}
      <style>{`
        [data-cat-track]::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
