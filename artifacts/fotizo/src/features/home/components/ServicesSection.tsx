import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ServiceCard } from "@/features/artisans/components/ServiceCard";
import { useServices } from "@/features/artisans/hooks";
import { SectionHeader } from "@/components/common/SectionHeader";

export function ServicesSection() {
  const { data: services = [] } = useServices();

  return (
    <section className="py-20 bg-white">
      <div className="container-app">
        <SectionHeader
          title="Top Professionals"
          subtitle="Hire vetted experts for your next project."
          action={
            <button className="hidden md:flex items-center text-primary font-medium hover:underline mt-4 md:mt-0">
              Browse all services <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          }
        />

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
