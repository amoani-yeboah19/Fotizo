import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { useProducts } from "@/features/marketplace/hooks";
import { SectionHeader } from "@/components/common/SectionHeader";

// A teaser, not the catalogue — the shop has well over a hundred items and the
// home page was rendering every one. Two full rows at the lg:grid-cols-4 width.
const PREVIEW_COUNT = 8;

export function ProductsSection() {
  const { data: products = [] } = useProducts();
  const previewProducts = products.slice(0, PREVIEW_COUNT);

  return (
    <section className="py-20 bg-background">
      <div className="container-app">
        <SectionHeader
          title="Trending Products"
          subtitle="Discover premium items handpicked for you."
          action={
            <Link href="/shop">
              <span className="hidden md:flex items-center text-primary font-medium hover:underline mt-4 md:mt-0 cursor-pointer">
                View all products <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {previewProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center md:hidden">
          <Link href="/shop">
            <span className="flex items-center text-primary font-medium hover:underline cursor-pointer">
              View all products <ArrowRight className="w-4 h-4 ml-1" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
