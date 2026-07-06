import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Linkedin, Globe } from "lucide-react";
import { CurrencySwitcher } from "@/components/layout/navbar/CurrencySwitcher";

interface FooterLink {
  label: string;
  href: string;
}

// Fiverr-style footer: light surface, five link columns, slim bottom bar with
// brand + socials + locale controls. Placeholder links point at real routes
// where they exist and "#" where the page is still to come.
const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Categories",
    links: [
      { label: "Graphics & Design", href: "/services" },
      { label: "Digital Marketing", href: "/services" },
      { label: "Writing & Translation", href: "/services" },
      { label: "Video & Animation", href: "/services" },
      { label: "Programming & Tech", href: "/services" },
      { label: "AI Services", href: "/services" },
      { label: "Business", href: "/services" },
      { label: "Photography", href: "/services" },
      { label: "Electronics", href: "/products" },
      { label: "Fashion", href: "/products" },
      { label: "Home & Living", href: "/products" },
    ],
  },
  {
    heading: "For Clients",
    links: [
      { label: "How Fotizo Works", href: "#" },
      { label: "Customer Success Stories", href: "#" },
      { label: "Quality Guide", href: "#" },
      { label: "Fotizo Guides", href: "/guides" },
      { label: "Browse Services", href: "/services" },
      { label: "Shop Products", href: "/products" },
    ],
  },
  {
    heading: "For Sellers",
    links: [
      { label: "Become a Fotizo Seller", href: "/signup" },
      { label: "Post a Product", href: "/dashboard/seller/products/new" },
      { label: "Offer a Service", href: "/dashboard/seller/services/new" },
      { label: "Community Hub", href: "#" },
      { label: "Forum", href: "#" },
      { label: "Events", href: "#" },
    ],
  },
  {
    heading: "Business Solutions",
    links: [
      { label: "Fotizo for Business", href: "#" },
      { label: "Project Management", href: "#" },
      { label: "Expert Sourcing", href: "#" },
      { label: "Logo Maker", href: "#" },
      { label: "Contact Sales", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Fotizo", href: "#" },
      { label: "Help Center", href: "#" },
      { label: "Trust & Safety", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Partnerships", href: "#" },
      { label: "Invite a Friend", href: "#" },
      { label: "Press & News", href: "#" },
    ],
  },
];

const SOCIALS = [
  { icon: Facebook, label: "Fotizo on Facebook" },
  { icon: Twitter, label: "Fotizo on X" },
  { icon: Instagram, label: "Fotizo on Instagram" },
  { icon: Linkedin, label: "Fotizo on LinkedIn" },
];

function FooterAnchor({ link }: { link: FooterLink }) {
  const className = "text-muted-foreground hover:text-foreground hover:underline transition-colors";
  return link.href === "#" ? (
    <a href="#" className={className}>{link.label}</a>
  ) : (
    <Link href={link.href} className={className}>{link.label}</Link>
  );
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-border pt-14 pb-8">
      <div className="container-app">
        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12 mb-14">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="font-bold text-foreground mb-5">{col.heading}</h4>
              <ul className="space-y-3.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterAnchor link={link} />
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
            <div className="flex items-center gap-1">
              {SOCIALS.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </a>
              ))}
            </div>
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
