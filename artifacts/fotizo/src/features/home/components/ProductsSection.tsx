import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/common/ProductCard";
import { useProducts } from "@/features/marketplace/hooks";
import { SectionHeader } from "@/components/common/SectionHeader";

export function ProductsSection() {
  const { data: products = [] } = useProducts();

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionHeader
          title="Trending Products"
          subtitle="Discover premium items handpicked for you."
          action={
            <button className="hidden md:flex items-center text-primary font-medium hover:underline mt-4 md:mt-0">
              View all products <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
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
          <button className="flex items-center text-primary font-medium hover:underline">
            View all products <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
