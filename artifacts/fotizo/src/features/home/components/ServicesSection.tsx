import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ServiceCard } from "@/features/artisans/components/ServiceCard";
import { useServices } from "@/features/artisans/hooks";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SERVICE_GROUPS } from "@workspace/service-taxonomy";

// Home page teaser only — the full listing lives on /services.
const MAX_CARDS = 6;

export function ServicesSection() {
  const { data: services = [] } = useServices();

  // Lead with a spread across the three provider groups rather than whichever
  // six are newest, so the section never reads as "this is a freelancer site".
  const featured = [
    ...SERVICE_GROUPS.flatMap((g) => services.filter((s) => s.group === g.id).slice(0, 2)),
    ...services,
  ]
    .filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i)
    .slice(0, MAX_CARDS);

  if (featured.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="container-app">
        <SectionHeader
          title="Top Professionals"
          subtitle="Vetted freelancers, artisans and businesses ready to take your job."
          action={
            <Link href="/services">
              <span className="hidden md:flex items-center text-primary font-medium hover:underline mt-4 md:mt-0 cursor-pointer">
                Browse all services <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </span>
            </Link>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((service, index) => (
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
          <Link href="/services">
            <span className="flex items-center text-primary font-medium hover:underline cursor-pointer">
              Browse all services <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
