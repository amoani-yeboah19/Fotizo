import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { GuideCard } from "@/features/guides/components/GuideCard";
import { getPopularGuides } from "@/features/guides/data/guides";

export function Guides() {
  const guides = getPopularGuides().slice(0, 3);

  return (
    <section className="py-20 bg-background">
      <div className="container-app">
        <SectionHeader
          title="Guides to help you grow"
          subtitle="Playbooks, tips and ideas to build and scale your business on Fotizo."
          action={
            <Link href="/guides" className="hidden md:flex items-center text-primary font-medium hover:underline">
              See all guides <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
            </Link>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((g) => <GuideCard key={g.slug} guide={g} />)}
        </div>
        <div className="mt-8 flex justify-center md:hidden">
          <Link href="/guides" className="flex items-center text-primary font-medium hover:underline">
            See all guides <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
