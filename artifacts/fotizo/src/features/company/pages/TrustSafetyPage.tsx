import { Link } from "wouter";
import { ShieldCheck, PackageCheck, BadgeCheck, Lock, AlertTriangle } from "lucide-react";
import { ContentPage, Section, Bullets } from "@/features/company/components/ContentPage";

const PILLARS = [
  {
    icon: PackageCheck,
    title: "Inspected before dispatch",
    body: "Goods are checked at the supplier in China before they ship, not after they land. A fault found at source costs a replacement; found here it costs a return shipment.",
  },
  {
    icon: ShieldCheck,
    title: "Buyer protection on every order",
    body: "Damaged, wrong, or never arrived — you get a refund or replacement. It applies to every order, not a premium tier.",
  },
  {
    icon: Lock,
    title: "Protected checkout",
    body: "Card details are handled by the payment provider and never stored on our servers.",
  },
  {
    icon: BadgeCheck,
    title: "Verified providers",
    body: "Service providers are reviewed before listing, and the group they appear under is derived from their trade rather than chosen by them.",
  },
];

export default function TrustSafetyPage() {
  return (
    <ContentPage
      eyebrow="Trust & Safety"
      title="How we protect your order"
      intro="Buying across borders means trusting someone you can't walk to. Here's what we do to earn that, and what to do when something goes wrong."
    >
      <Section title="The basics">
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-white p-5">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Staying safe on the platform">
        <Bullets
          items={[
            <>
              <strong className="text-foreground">Keep payment on Fotizo.</strong> A seller or
              provider who asks you to pay by direct transfer is taking you outside buyer
              protection. Report it.
            </>,
            <>
              <strong className="text-foreground">Keep conversations in Messages.</strong> If a
              dispute happens, we can only see what was said on the platform.
            </>,
            <>
              <strong className="text-foreground">Be wary of prices far below the rest.</strong> On
              imported goods, a price that undercuts everything similar usually means a different
              specification, not a bargain.
            </>,
            <>
              <strong className="text-foreground">We will never ask for your password.</strong> Nor
              will we ask for card details over the phone or by message.
            </>,
          ]}
        />
      </Section>

      <Section title="Buying a vehicle">
        <p>
          Vehicles are the highest-value thing we ship and work differently to everything else. No
          payment is ever taken online for a car. You enquire, we confirm a binding quote once we
          know the destination country and specification, and payment terms are agreed in writing
          before anything is ordered. Anyone contacting you asking for a deposit outside that
          process is not us.
        </p>
      </Section>

      <Section title="If something goes wrong">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="inline-flex items-center gap-2 font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Report it as early as you can
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The sooner an issue is raised, the more we can do about it — a package still in transit
            can be traced, and a supplier can be held to account while the shipment is recent. Open
            a request on the{" "}
            <Link href="/support">
              <span className="cursor-pointer font-semibold text-primary hover:underline">
                customer service page
              </span>
            </Link>
            . You don't need to be signed in, and you don't need your order number if you can't find
            it.
          </p>
        </div>
      </Section>
    </ContentPage>
  );
}
