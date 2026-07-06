import { useRoute, Link } from "wouter";
import { Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { GuideCard } from "@/features/guides/components/GuideCard";
import { getGuide, getRelatedGuides } from "@/features/guides/data/guides";

export default function GuideArticlePage() {
  const [, params] = useRoute("/guides/:slug");
  const guide = params?.slug ? getGuide(params.slug) : undefined;

  if (!guide) {
    return (
      <PageLayout mainClassName="container-app py-32 text-center">
        <h1 className="heading-page text-foreground">Guide not found</h1>
        <p className="text-muted-foreground mt-2">This guide may have moved or been removed.</p>
        <Link href="/guides">
          <Button className="mt-6 gap-2"><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Guides</Button>
        </Link>
      </PageLayout>
    );
  }

  const related = getRelatedGuides(guide.slug);

  return (
    <PageLayout>
      <article>
        {/* Header */}
        <header className="bg-[#08275B] text-white">
          <div className="container-app pt-32 pb-12 lg:pt-36 max-w-3xl">
            <nav className="flex items-center gap-1.5 text-sm text-white/60 mb-5">
              <Link href="/guides" className="hover:text-white">Guides</Link>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-white/80">{guide.category}</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">{guide.title}</h1>
            <p className="mt-4 text-white/70 leading-relaxed">{guide.excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/60">
              <span className="font-medium text-white/80">{guide.author}</span>
              <span aria-hidden="true">·</span>
              <span>{guide.date}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> {guide.readingTime}</span>
            </div>
          </div>
        </header>

        {/* Hero image */}
        <div className="container-app max-w-3xl -mt-0">
          <img
            src={guide.image}
            alt=""
            loading="eager"
            decoding="async"
            className="w-full aspect-[16/9] object-cover rounded-b-2xl"
          />
        </div>

        {/* Body */}
        <div className="container-app max-w-3xl py-12">
          <div className="space-y-5">
            {guide.content.map((block, i) => {
              if (block.type === "h2") {
                return <h2 key={i} className="text-2xl font-bold text-foreground pt-4">{block.text}</h2>;
              }
              if (block.type === "ul") {
                return (
                  <ul key={i} className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
                    {block.items.map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                );
              }
              return <p key={i} className="text-lg text-muted-foreground leading-relaxed">{block.text}</p>;
            })}
          </div>

          {/* CTA */}
          <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-foreground">Ready to put this into action?</p>
              <p className="text-sm text-muted-foreground mt-0.5">Start selling your products or services on Fotizo today.</p>
            </div>
            <Link href="/signup"><Button className="rounded-full px-6 h-11 shrink-0">Get started free</Button></Link>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="py-14 bg-background border-t border-border">
            <div className="container-app">
              <h2 className="heading-section mb-8">Related guides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((g) => <GuideCard key={g.slug} guide={g} />)}
              </div>
            </div>
          </section>
        )}
      </article>
    </PageLayout>
  );
}
