import { useRef, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CategoryCard,
  CARD_W,
  type Category,
} from "@/features/home/components/CategoryCard";
import { categoryLabel } from "@/features/shop/data/categories";
import type { CatalogueCategory } from "@/features/marketplace/services/catalogue-page";
import { useCatalogueCategories } from "@/features/marketplace/hooks/useCatalogue";

// Full-channel API aggregates supply counts and representative product images.
// Fotizo Shop departments lead once shop inventory is published; until then the
// section shows the live marketplace categories instead of an empty track.
// Accent colors remain stable for the displayed category order.
const ACCENTS = [
  "#1E3A5F",
  "#3D2B1F",
  "#2D4A3E",
  "#5C2A3A",
  "#1A3A2A",
  "#2C1F0E",
  "#0D2A4A",
  "#1A1A2E",
  "#3D1F0D",
  "#123040",
  "#3A2233",
  "#2C3038",
];

function toCards(categories: CatalogueCategory[], base: "/shop" | "/products"): Category[] {
  return [...categories]
    .filter((c) => c.count > 0 && c.image)
    .sort((a, b) => b.count - a.count)
    .map((c, i) => ({
      id: c.category,
      name: categoryLabel(c.category),
      count: `${c.count} ${c.count === 1 ? "item" : "items"}`,
      image: c.image,
      accent: ACCENTS[i % ACCENTS.length],
      href: `${base}?category=${encodeURIComponent(c.category)}`,
      badge: base === "/shop" ? "Shop" : "Marketplace",
    }));
}

export function Categories() {
  const shop = useCatalogueCategories("shop");
  const marketplace = useCatalogueCategories("marketplace");
  const shopCards = useMemo(() => toCards(shop.data ?? [], "/shop"), [shop.data]);
  const marketplaceCards = useMemo(
    () => toCards(marketplace.data ?? [], "/products"),
    [marketplace.data],
  );
  const showingShop = shopCards.length > 0;
  const CATEGORIES = showingShop ? shopCards : marketplaceCards;

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
  }, [CATEGORIES.length]);

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
    el.scrollBy({
      left: dir === "right" ? (CARD_W + GAP) * 2 : -(CARD_W + GAP) * 2,
      behavior: "smooth",
    });
    startAuto();
  };

  // Nothing published in either channel (or both requests failed): omit the
  // section rather than render a heading over an empty carousel.
  if (!CATEGORIES.length) return null;

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
              {showingShop ? "Explore Shop Categories" : "Explore Marketplace Categories"}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="text-muted-foreground mt-1.5"
            >
              {showingShop
                ? "Every department in Fotizo Shop, sourced and shipped worldwide."
                : "Products listed by sellers on Fotizo, grouped by category."}
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
