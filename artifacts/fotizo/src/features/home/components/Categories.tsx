import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryCard, CARD_W, type Category } from "@/features/home/components/CategoryCard";
import { shopCategoryCards } from "@/features/shop/data/products";

// Cover art is the first product photo in each department, so the artwork can
// never advertise something the department doesn't stock, and there's no second
// asset pipeline to keep in sync. Departments with no stock are left out
// entirely by shopCategoryCards().
//
// Accents are the gradient scrim colour only — a deep, desaturated palette that
// keeps the white title legible over any photo. Assigned by position so the
// order stays stable as the catalogue grows.
const ACCENTS = [
  "#1E3A5F", "#3D2B1F", "#2D4A3E", "#5C2A3A", "#1A3A2A", "#2C1F0E",
  "#0D2A4A", "#1A1A2E", "#3D1F0D", "#123040", "#3A2233", "#2C3038",
];

const CATEGORIES: Category[] = shopCategoryCards().map((c, i) => ({
  id: c.id,
  name: c.label,
  count: `${c.count} ${c.count === 1 ? "item" : "items"}`,
  image: c.image,
  accent: ACCENTS[i % ACCENTS.length],
  href: c.href,
}));

export function Categories() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      <div className="container-app">

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
              Explore Shop Categories
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="text-muted-foreground mt-1.5"
            >
              Every department in Fotizo Shop, sourced and shipped worldwide.
            </motion.p>
          </div>

          {/* Arrow controls */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              aria-label="Scroll categories left"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              aria-label="Scroll categories right"
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
          <CategoryCard key={cat.id} cat={cat} index={i} />
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
