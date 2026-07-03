import { PageLayout } from "@/components/layout/PageLayout";
import { Hero } from "@/features/home/components/Hero";
import { Categories } from "@/features/home/components/Categories";
import { ProductsSection } from "@/features/home/components/ProductsSection";
import { ServicesSection } from "@/features/home/components/ServicesSection";
import { WhyFotizo } from "@/features/home/components/WhyFotizo";
import { Testimonials } from "@/features/home/components/Testimonials";
import { Newsletter } from "@/features/home/components/Newsletter";

export default function Home() {
  return (
    <PageLayout>
      <Hero />
      <Categories />
      <ProductsSection />
      <ServicesSection />
      <WhyFotizo />
      <Testimonials />
      <Newsletter />
    </PageLayout>
  );
}
