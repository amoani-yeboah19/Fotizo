import { Link } from "wouter";
import { Store, CarFront, Users, Globe2 } from "lucide-react";
import { ContentPage, Section, Bullets } from "@/features/company/components/ContentPage";
import { DELIVERY_WINDOWS } from "@/features/support/data/channels";

// Written from what Fotizo demonstrably is today — three storefronts and a
// sourcing operation — rather than aspirational marketing. Deliberately no
// invented user counts, funding claims or founding dates.
const ARMS = [
  {
    icon: Store,
    title: "Fotizo Shop",
    body: `Everyday goods sourced through our supplier network in China, consolidated and shipped in ${DELIVERY_WINDOWS.shop}.`,
    href: "/shop",
    cta: "Browse the shop",
  },
  {
    icon: CarFront,
    title: "Fotizo Autos",
    body: "New vehicles from Toyota, BYD, Changan, Jetour and more — imported to order and shipped to your nearest port.",
    href: "/autos",
    cta: "See the range",
  },
  {
    icon: Users,
    title: "Fotizo Services",
    body: "Freelancers, artisans and registered businesses, grouped by the work they actually do so you can find the right one.",
    href: "/services",
    cta: "Find a professional",
  },
];

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About"
      title="What Fotizo is"
      intro="A sourcing and marketplace business connecting buyers to imported goods, vehicles and skilled professionals — built for people who've been let down by both."
    >
      <Section title="The problem we work on">
        <p>
          Buying anything imported usually means choosing between two bad options: pay a large markup
          to a local reseller who won't tell you where it came from, or order directly from overseas
          and hope it arrives. Neither gives you a person to call when it doesn't.
        </p>
        <p>
          Hiring is much the same. Good tradespeople and freelancers exist everywhere, but finding
          one usually depends on who you happen to know.
        </p>
      </Section>

      <Section title="What we run">
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {ARMS.map(({ icon: Icon, title, body, href, cta }) => (
            <div key={title} className="rounded-xl border border-border bg-white p-5">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <Link href={href}>
                <span className="mt-3 inline-block cursor-pointer text-sm font-semibold text-primary hover:underline">
                  {cta} →
                </span>
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How we're set up">
        <p className="inline-flex items-center gap-2 font-medium text-foreground">
          <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
          We sell worldwide, with hubs in Ghana, the UK, the USA and China.
        </p>
        <Bullets
          items={[
            <>
              <strong className="text-foreground">China</strong> — sourcing and quality control. Our
              team inspects goods at the supplier before anything is paid for or shipped.
            </>,
            <>
              <strong className="text-foreground">Ghana</strong> — clearing, last-mile delivery and
              the local services marketplace.
            </>,
            <>
              <strong className="text-foreground">UK &amp; USA</strong> — seller relationships and
              customers buying into the network from those markets.
            </>,
          ]}
        />
      </Section>

      <Section title="What we won't do">
        <Bullets
          items={[
            "Hide where something came from. Every shop listing says plainly that it's an import, and roughly how long it will take.",
            "Quote a car price we can't stand behind. Vehicle prices are estimates until we know your destination and spec, because duty differs by country.",
            "Leave you talking to a bot. When an order goes wrong there's a person on the other end.",
          ]}
        />
      </Section>

      <Section title="Talk to us">
        <p>
          Something gone wrong with an order, or a question before you buy — our{" "}
          <Link href="/support">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              customer service page
            </span>
          </Link>{" "}
          is the fastest route to a human. If you want to sell or offer a service on Fotizo,{" "}
          <Link href="/signup">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              create an account
            </span>
          </Link>{" "}
          and you can list straight away.
        </p>
      </Section>
    </ContentPage>
  );
}
