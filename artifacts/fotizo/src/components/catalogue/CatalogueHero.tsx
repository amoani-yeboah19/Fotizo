import type { ReactNode } from "react";
import { ArrowDownRight } from "lucide-react";
import "./catalogue.css";

export function CatalogueHero({
  eyebrow,
  title,
  accent,
  description,
  target,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  target: string;
  action: string;
  children: ReactNode;
}) {
  return (
    <section className="catalogue-hero">
      <div className="catalogue-hero-copy">
        <p className="catalogue-eyebrow">{eyebrow}</p>
        <h1>
          {title}
          <br />
          <em>{accent}</em>
        </h1>
        <p className="catalogue-description">{description}</p>
        <a className="catalogue-action" href={target}>
          {action}
          <ArrowDownRight size={18} aria-hidden="true" />
        </a>
      </div>
      <div className="catalogue-hero-visual">{children}</div>
    </section>
  );
}
