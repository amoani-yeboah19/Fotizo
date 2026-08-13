import { PageLayout } from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Hero } from "@/features/home/components/Hero";
import { Categories } from "@/features/home/components/Categories";
import { ProductsSection } from "@/features/home/components/ProductsSection";
import { ServicesSection } from "@/features/home/components/ServicesSection";
import { PopularServices } from "@/features/home/components/PopularServices";
import { ProviderGroups } from "@/features/home/components/ProviderGroups";
import { MakeItHappen } from "@/features/home/components/MakeItHappen";
import { SupportBand } from "@/features/home/components/SupportBand";
import { Guides } from "@/features/home/components/Guides";
import { Newsletter } from "@/features/home/components/Newsletter";
import { PersonalizedHome } from "@/features/home/components/PersonalizedHome";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <PageLayout>
      {isAuthenticated ? (
        // Signed-in: personalized home (greeting + recommendations).
        <PersonalizedHome />
      ) : (
        // Signed-out: marketing landing page.
        <>
          <Hero />
          <Categories />
          <ProviderGroups />
          <PopularServices />
          <MakeItHappen />
          <ProductsSection />
          <ServicesSection />
          <SupportBand />
          <Guides />
          <Newsletter />
        </>
      )}
    </PageLayout>
  );
}
