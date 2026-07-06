import { Link } from "wouter";
import { Clock } from "lucide-react";
import type { Guide } from "@/features/guides/data/guides";

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link href={`/guides/${guide.slug}`}>
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white hover:shadow-lg transition-all cursor-pointer">
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          <img
            loading="lazy"
            decoding="async"
            src={guide.image}
            alt=""
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{guide.category}</span>
          <h3 className="mt-2 font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {guide.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{guide.excerpt}</p>
          <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{guide.author}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" /> {guide.readingTime}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
