import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GuideCard } from "@/features/guides/components/GuideCard";
import { GUIDES, GUIDE_TOPICS, getPopularGuides } from "@/features/guides/data/guides";

export default function GuidesPage() {
  const [topic, setTopic] = useState<string>("All");
  const popular = getPopularGuides();
  const filtered = topic === "All" ? GUIDES : GUIDES.filter((g) => g.category === topic);

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-[#08275B] text-white">
        <div className="container-app pt-32 pb-14 lg:pt-36">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
            <BookOpen className="w-4 h-4 text-[#FF6A00]" aria-hidden="true" /> Fotizo Guides
          </span>
          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl">
            Playbooks, tips and ideas to grow your business
          </h1>
          <p className="mt-4 text-white/70 max-w-xl leading-relaxed">
            Practical guides on selling, marketing, pricing, AI and more — written to help you earn
            more and work smarter on Fotizo.
          </p>
        </div>
      </section>

      {/* Choose your topic */}
      <section className="border-b border-border bg-white sticky top-20 z-30">
        <div className="container-app py-4 flex gap-2 overflow-x-auto">
          {["All", ...GUIDE_TOPICS].map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                topic === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Popular guides — only on the unfiltered view */}
      {topic === "All" && popular.length > 0 && (
        <section className="py-14 bg-background">
          <div className="container-app">
            <h2 className="heading-section mb-8">The most popular guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popular.slice(0, 3).map((g) => <GuideCard key={g.slug} guide={g} />)}
            </div>
          </div>
        </section>
      )}

      {/* All / filtered guides */}
      <section className="pb-20 pt-6 bg-background">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <h2 className="heading-section">{topic === "All" ? "All guides" : `${topic} guides`}</h2>
            <span className="text-sm text-muted-foreground">{filtered.length} guide{filtered.length === 1 ? "" : "s"}</span>
          </div>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((g) => <GuideCard key={g.slug} guide={g} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">No guides in this topic yet — check back soon.</p>
              <button onClick={() => setTopic("All")} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Browse all guides <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
