import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Linkedin, Globe } from "lucide-react";
import { SERVICE_CATEGORIES, serviceCategoryLabel } from "@workspace/service-taxonomy";
import { CurrencySwitcher } from "@/components/layout/navbar/CurrencySwitcher";
import { categoryLabel as shopCategoryLabel } from "@/features/shop/data/products";

interface FooterLink {
  label: string;
  href: string;
}

// Every link here resolves to a real page. Nothing points at "#" — a dead link
// in the footer reads as an abandoned site, and we had twenty-one of them.
// Anything we don't actually offer yet (Logo Maker, Forum, Press) was removed
// rather than left stubbed.

// Popular service categories, labelled from the taxonomy so a rename there
// renames here and we can't link to a category the filter doesn't have.
const POPULAR_SERVICE_IDS = [
  "graphic-design",
  "web-development",
  "digital-marketing",
  "fashion-design",
  "plumbing",
  "catering",
];

// Shop departments with real stock behind them.
const POPULAR_SHOP_IDS = ["wigs", "phones", "appliances", "shoes-bags"];

const CATEGORY_LINKS: FooterLink[] = [
  ...POPULAR_SERVICE_IDS.filter((id) => SERVICE_CATEGORIES.some((c) => c.id === id)).map((id) => ({
    label: serviceCategoryLabel(id),
    href: `/services?category=${id}`,
  })),
  ...POPULAR_SHOP_IDS.map((id) => ({
    label: shopCategoryLabel(id),
    href: `/shop?category=${id}`,
  })),
];

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  { heading: "Popular categories", links: CATEGORY_LINKS },
  {
    heading: "Buy",
    links: [
      { label: "Fotizo Shop", href: "/shop" },
      { label: "Fotizo Autos", href: "/autos" },
      { label: "Hire a professional", href: "/services" },
      { label: "Local marketplace", href: "/products" },
      { label: "How Fotizo works", href: "/how-it-works" },
    ],
  },
  {
    heading: "Sell",
    links: [
      { label: "Become a seller", href: "/signup" },
      { label: "Post a product", href: "/dashboard/seller/products/new" },
      { label: "Offer a service", href: "/dashboard/seller/services/new" },
      { label: "Seller dashboard", href: "/dashboard/seller" },
      { label: "Fotizo guides", href: "/guides" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Fotizo", href: "/about" },
      { label: "Help & support", href: "/support" },
      { label: "Trust & safety", href: "/trust-safety" },
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

// Social profiles. Each is null until the real account exists — a null entry is
// not rendered, so we never ship an icon that goes nowhere. Fill these in and
// the icons appear.
const SOCIALS: { icon: typeof Facebook; label: string; href: string | null }[] = [
  { icon: Facebook, label: "Fotizo on Facebook", href: null },
  { icon: Twitter, label: "Fotizo on X", href: null },
  { icon: Instagram, label: "Fotizo on Instagram", href: null },
  { icon: Linkedin, label: "Fotizo on LinkedIn", href: null },
];

export function Footer() {
  const socials = SOCIALS.filter((s) => s.href);

  return (
    <footer className="bg-white border-t border-border pt-14 pb-8">
      <div className="container-app">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 mb-14">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="font-bold text-foreground mb-5">{col.heading}</h4>
              <ul className="space-y-3.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Link href="/">
              <img
                loading="lazy"
                decoding="async"
                src="/fotizo-logo.webp"
                alt="Fotizo"
                className="h-5 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              © Fotizo International Ltd. {new Date().getFullYear()}
            </p>
          </div>

          <div className="flex items-center gap-5">
            {socials.length > 0 && (
              <div className="flex items-center gap-1">
                {socials.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
            <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Globe className="w-4 h-4" aria-hidden="true" /> English
            </span>
            <CurrencySwitcher dropUp />
          </div>
        </div>
      </div>
    </footer>
  );
}
