import { Link } from "wouter";
import { ContentPage, Section, Bullets } from "@/features/company/components/ContentPage";

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  DRAFT — NOT LEGALLY REVIEWED
//
// Written from what the application actually collects (account details, orders,
// messages, support requests, vehicle enquiries). It has NOT been reviewed by a
// lawyer. Fotizo trades in Ghana, the UK, the USA and China, so UK/EU GDPR and
// Ghana's Data Protection Act both plausibly apply — each has specific
// requirements on lawful basis, international transfers and data subject rights
// that a qualified adviser needs to confirm. Do not treat this as compliant
// until it has been reviewed.
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = "2026-08-15";

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What we collect, why we collect it, and what you can ask us to do with it."
      updated={LAST_UPDATED}
    >
      <Section title="What we collect">
        <Bullets
          items={[
            <>
              <strong className="text-foreground">Account details</strong> — your name, email
              address and password (stored hashed, never in readable form).
            </>,
            <>
              <strong className="text-foreground">Order information</strong> — what you bought,
              delivery address, order status and tracking.
            </>,
            <>
              <strong className="text-foreground">Messages</strong> — conversations between you and
              sellers or providers on the platform.
            </>,
            <>
              <strong className="text-foreground">Support requests and vehicle enquiries</strong> —
              the contact details and description you submit, including the destination country for
              a vehicle.
            </>,
            <>
              <strong className="text-foreground">Listings</strong> — if you sell, the products or
              services you publish and the business details shown with them.
            </>,
            <>
              <strong className="text-foreground">Technical data</strong> — basic information your
              browser sends, and a session record that keeps you signed in.
            </>,
          ]}
        />
        <p>
          We do not store full payment card details. Card data is handled by our payment provider.
        </p>
      </Section>

      <Section title="Why we use it">
        <Bullets
          items={[
            "To create and secure your account.",
            "To process orders, arrange shipping and clearing, and keep you updated on where things are.",
            "To answer support requests and investigate what happened when an order goes wrong.",
            "To quote vehicle enquiries, which requires knowing the destination country.",
            "To detect fraud and abuse, and to meet legal and customs obligations.",
          ]}
        />
        <p>
          We do not sell your personal data, and we do not share it with advertisers.
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>
          Only where it's necessary to do what you asked, or where the law requires it:
        </p>
        <Bullets
          items={[
            "Sellers and providers you transact with — enough to fulfil your order or booking.",
            "Shipping, freight and customs agents — the details required to move and clear your goods.",
            "Payment processors — to take payment and handle refunds.",
            "Service providers who host and run the platform on our behalf.",
            "Authorities, where we are legally obliged to disclose.",
          ]}
        />
      </Section>

      <Section title="International transfers">
        <p>
          Fotizo operates across Ghana, the UK, the USA and China, and fulfilling an order routinely
          means moving information between them — a Ghanaian customer's delivery details reach our
          sourcing team in China, for example. Where data leaves the country it was collected in, we
          take reasonable steps to protect it in transit and to limit it to what the recipient needs.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Account and order records are kept while your account is open and afterwards for as long
          as we need them for tax, customs and dispute purposes. Support requests are kept long
          enough to resolve the issue and spot recurring problems. You can ask us to delete your
          account, subject to records we're legally required to retain.
        </p>
      </Section>

      <Section title="Your rights">
        <p>You can ask us to:</p>
        <Bullets
          items={[
            "Give you a copy of the personal data we hold about you.",
            "Correct anything that's wrong.",
            "Delete your data, where we're not legally required to keep it.",
            "Stop using it for a particular purpose.",
          ]}
        />
        <p>
          Depending on where you live, you may also have the right to complain to a data protection
          regulator.
        </p>
      </Section>

      <Section title="Cookies and similar storage">
        <p>
          We use browser storage to keep you signed in, remember your cart and currency, and
          remember whether you've dismissed certain notices. These are needed for the site to work
          rather than for advertising.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          To make a request about your data, or to ask how any of this works in practice, use our{" "}
          <Link href="/support">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              customer service page
            </span>
          </Link>
          . See also our{" "}
          <Link href="/terms">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              Terms of Service
            </span>
          </Link>
          .
        </p>
      </Section>
    </ContentPage>
  );
}
