import { Link } from "wouter";
import { ChevronDown, type LucideIcon } from "lucide-react";

export interface MegaMenuItem {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  /** Renders the label in the Shop orange, for the flagship destination in a group. */
  accent?: boolean;
}

// Shared dropdown for the two top-level nav groups. Opens on hover, and on
// focus-within so it's reachable by keyboard — the old Products menu was
// hover-only and unusable without a mouse.
export function NavMegaMenu({
  label,
  href,
  items,
  footer,
}: {
  label: string;
  href: string;
  items: MegaMenuItem[];
  footer?: { text: string; linkText: string; href: string };
}) {
  return (
    <div className="relative group">
      <Link href={href}>
        <span className="flex items-center gap-1 py-8 text-sm font-medium text-foreground transition-colors hover:text-primary cursor-pointer">
          {label} <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>

      <div className="invisible absolute left-1/2 top-full w-[420px] -translate-x-1/2 rounded-xl border border-border bg-white p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <span className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted">
                  <item.icon
                    className={`mt-0.5 h-5 w-5 shrink-0 ${item.accent ? "text-[#FF6A00]" : "text-primary"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold ${item.accent ? "text-[#FF6A00]" : "text-foreground"}`}
                    >
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {footer && (
          <div className="mt-1 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
            <span className="text-xs text-muted-foreground">{footer.text}</span>
            <Link href={footer.href}>
              <span className="shrink-0 cursor-pointer text-xs font-semibold text-primary hover:underline">
                {footer.linkText} &rarr;
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
