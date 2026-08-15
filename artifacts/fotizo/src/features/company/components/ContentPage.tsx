import type { ReactNode } from "react";
import { PageLayout } from "@/components/layout/PageLayout";

// Shared shell for the company/legal pages reached from the footer. They all
// want the same thing: a gradient masthead, a readable measure, and consistent
// typography — so the layout lives here rather than being copied five times.
export function ContentPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  /** ISO date, shown as "Last updated" on the legal pages. */
  updated?: string;
  children: ReactNode;
}) {
  return (
    <PageLayout mainClassName="pt-20">
      <section className="bg-gradient-to-r from-[#08275B] via-[#0a2f6e] to-[#FF6A00]">
        <div className="container-app py-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
          {intro && <p className="mt-3 max-w-2xl text-white/85">{intro}</p>}
        </div>
      </section>

      <div className="container-app max-w-3xl py-12">
        {updated && (
          <p className="mb-8 text-sm text-muted-foreground">
            Last updated{" "}
            {new Date(updated).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        <div className="space-y-8">{children}</div>
      </div>
    </PageLayout>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 leading-relaxed text-muted-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
