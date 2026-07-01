import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { services } from "../data/mockData";
import { ServiceCard } from "./ServiceCard";

export function ServicesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Top Professionals</h2>
            <p className="text-muted-foreground mt-2">Hire vetted experts for your next project.</p>
          </div>
          <button className="hidden md:flex items-center text-primary font-medium hover:underline mt-4 md:mt-0">
            Browse all services <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <ServiceCard service={service} />
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex justify-center md:hidden">
          <button className="flex items-center text-primary font-medium hover:underline">
            Browse all services <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
