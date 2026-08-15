import { Link } from "wouter";
import { ContentPage, Section } from "@/features/company/components/ContentPage";
import { DELIVERY_WINDOWS } from "@/features/support/data/channels";

// Steps describe what the platform actually does today. Delivery windows are
// pulled from the support config so this page, the support FAQ and the shop's
// import notice can't quote different numbers at each other.
const BUYING = [
  {
    title: "Find it",
    body: "Browse Fotizo Shop for imported goods, Fotizo Autos for vehicles, or Services to hire a professional. Filter by category, and for cars by make, body style and fuel.",
  },
  {
    title: "Order or enquire",
    body: "Shop items go straight into the cart and checkout. Vehicles work on enquiry instead — you tell us the spec and destination, and we come back with a firm quote including duty.",
  },
  {
    title: "We source and check it",
    body: "Your order is picked up by our team at source. Goods are inspected before dispatch rather than after arrival, which is when problems are still cheap to fix.",
  },
  {
    title: "It ships",
    body: `Shop orders are consolidated and sent by air (${DELIVERY_WINDOWS.air}) or sea (${DELIVERY_WINDOWS.sea}). Vehicles take ${DELIVERY_WINDOWS.vehicles} from confirmed order to handover, covering production, freight, clearing and registration.`,
  },
  {
    title: "You track it — and can reach us",
    body: "Order status and any tracking number live in your dashboard. If it's late or wrong, raise it on the support page and a person picks it up.",
  },
];

const SELLING = [
  {
    title: "Create an account",
    body: "Sign up as a seller. You can list products, offer services, or both from the same account.",
  },
  {
    title: "List what you do",
    body: "Post a product with photos and stock, or offer a service with packages and pricing. Pick the category that matches your trade and we file you under the right group automatically.",
  },
  {
    title: "Get found",
    body: "Buyers filter by group and category, so a plumber shows up under Artisans & Trades and a designer under Freelancers — no fighting for the same generic listing page.",
  },
  {
    title: "Talk and deliver",
    body: "Buyers message you directly through the platform. Orders and bookings appear in your seller dashboard.",
  },
];

function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="mt-4 space-y-5">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {i + 1}
          </span>
          <div>
            <h3 className="font-semibold text-foreground">{step.title}</h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorksPage() {
  return (
    <ContentPage
      eyebrow="How it works"
      title="Buying and selling on Fotizo"
      intro="Three storefronts, one account. Here's what actually happens at each step."
    >
      <Section title="If you're buying">
        <Steps steps={BUYING} />
      </Section>

      <Section title="If you're selling">
        <Steps steps={SELLING} />
      </Section>

      <Section title="What protects you">
        <p>
          Every order is covered by buyer protection — if something arrives damaged, wrong, or never
          arrives at all, you're entitled to a refund or replacement. Goods are inspected before
          dispatch, and payment is taken through a protected checkout. More detail on{" "}
          <Link href="/trust-safety">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              Trust &amp; Safety
            </span>
          </Link>
          .
        </p>
      </Section>

      <Section title="Still unsure?">
        <p>
          Our{" "}
          <Link href="/guides">
            <span className="cursor-pointer font-semibold text-primary hover:underline">guides</span>
          </Link>{" "}
          cover pricing, branding and selling online in more depth, and{" "}
          <Link href="/support">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              customer service
            </span>
          </Link>{" "}
          will answer anything they don't.
        </p>
      </Section>
    </ContentPage>
  );
}
