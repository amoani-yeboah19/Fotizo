import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export const CARD_W = 280;

export interface Category {
  id: string;
  name: string;
  count: string;
  image: string;
  accent: string;
}

export function CategoryCard({ cat, index }: { cat: Category; index: number }) {
  return (
    <Link href={`/products?category=${encodeURIComponent(cat.name)}`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4) }}
        className="group relative shrink-0 snap-start cursor-pointer overflow-hidden rounded-3xl shadow-md hover:shadow-xl transition-shadow duration-300"
        style={{ width: CARD_W, height: 360 }}
      >
        {/* image */}
        <img
          src={cat.image}
          alt={cat.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
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
  );
}
