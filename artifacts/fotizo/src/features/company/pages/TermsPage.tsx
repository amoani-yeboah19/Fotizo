import { Link } from "wouter";
import { ContentPage, Section, Bullets } from "@/features/company/components/ContentPage";

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  DRAFT — NOT LEGALLY REVIEWED
//
// This is a plain-English starting point written from how the platform actually
// behaves. It has NOT been reviewed by a lawyer and is not a substitute for
// terms drafted for the jurisdictions Fotizo trades in (Ghana, UK, USA, plus
// wherever vehicles are delivered). Consumer law on refunds, returns and
// distance selling differs by country and some of it cannot be contracted out
// of. Have a qualified solicitor review this before you rely on it.
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = "2026-08-15";

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="The agreement between you and Fotizo when you buy, sell or list on the platform."
      updated={LAST_UPDATED}
    >
      <Section title="1. Who we are">
        <p>
          Fotizo International Ltd ("Fotizo", "we", "us") operates this platform, comprising Fotizo
          Shop (imported goods), Fotizo Autos (vehicles), and a marketplace for products and
          services listed by third-party sellers and providers.
        </p>
        <p>
          By creating an account, placing an order or listing on Fotizo, you agree to these terms.
        </p>
      </Section>

      <Section title="2. Your account">
        <Bullets
          items={[
            "You must give accurate registration details and keep them current.",
            "You are responsible for activity under your account and for keeping your password secure. Tell us immediately if you believe it has been compromised.",
            "You must be old enough to enter a binding contract in your country.",
            "We may suspend or close an account that breaches these terms, is used fraudulently, or puts other users at risk.",
          ]}
        />
      </Section>

      <Section title="3. Buying imported goods">
        <p>
          Items in Fotizo Shop are imported through our supplier network. When you place an order:
        </p>
        <Bullets
          items={[
            "Delivery estimates are estimates. They begin at dispatch, not at the point of ordering, and depend on freight and customs clearance outside our control.",
            "Prices are shown in your selected currency, converted from our base currency. The converted figure may move with exchange rates before your order is placed.",
            "Where import duty or local taxes apply on arrival, we will tell you before you pay whether they are included.",
            "Product photographs are representative. Minor variation in finish or packaging does not by itself constitute a faulty item.",
          ]}
        />
      </Section>

      <Section title="4. Buying a vehicle">
        <p>
          Fotizo Autos operates on enquiry, not online checkout. Prices shown on vehicle listings are{" "}
          <strong className="text-foreground">indicative estimates</strong> covering the vehicle and
          sea freight, and exclude the destination country's duty and taxes.
        </p>
        <Bullets
          items={[
            "No contract of sale is formed by submitting an enquiry or by any price displayed on the site.",
            "A binding quote is issued in writing once the destination, specification and delivery terms are agreed.",
            "Lead times are estimates covering production, freight, customs clearance and registration, and are not guaranteed.",
            "Registration and roadworthiness requirements are the destination country's, and we will tell you what we can and cannot arrange.",
          ]}
        />
      </Section>

      <Section title="5. Buyer protection, refunds and returns">
        <p>
          Orders are covered by buyer protection. If an item arrives damaged, materially differs
          from its description, or does not arrive within a reasonable period after the estimated
          window, you are entitled to a repair, replacement or refund.
        </p>
        <Bullets
          items={[
            "Raise the issue through our support page as soon as you become aware of it.",
            "Keep the item and its packaging until the claim is resolved; we may ask for photographs.",
            "Nothing here limits your statutory rights under the consumer law of your country, which take precedence where they conflict with these terms.",
          ]}
        />
      </Section>

      <Section title="6. Selling and offering services">
        <Bullets
          items={[
            "You are responsible for the accuracy of your listings, for holding the stock you advertise, and for delivering what you sell.",
            "You must hold any licence, registration or qualification your trade requires in your jurisdiction.",
            "You may not list counterfeit, stolen, unsafe or illegal goods, or services you are not competent to perform.",
            "The provider group your listing appears under is derived from the category you select and is set by us, not by you.",
            "We may remove a listing that breaches these terms or that we reasonably believe misleads buyers.",
          ]}
        />
      </Section>

      <Section title="7. Payments">
        <p>
          Payments are processed by third-party providers. We do not store full card details. You
          agree to pay the total shown at checkout, including any delivery charge, in the currency
          charged. Where a seller is paid out for an order, that payout may be held until the buyer
          protection window has passed.
        </p>
      </Section>

      <Section title="8. Prohibited use">
        <Bullets
          items={[
            "Do not use Fotizo to defraud, harass or impersonate anyone.",
            "Do not attempt to move a transaction off-platform to avoid fees or buyer protection.",
            "Do not scrape, probe or interfere with the platform's operation or security.",
            "Do not upload content you do not have the right to use.",
          ]}
        />
      </Section>

      <Section title="9. Our liability">
        <p>
          We provide the platform with reasonable care and skill, but we do not guarantee
          uninterrupted availability. To the extent permitted by law, we are not liable for indirect
          or consequential loss, or for loss of profit or business opportunity. Nothing in these
          terms excludes liability for death or personal injury caused by negligence, for fraud, or
          for anything else that cannot lawfully be excluded.
        </p>
        <p>
          For transactions between a buyer and a third-party seller or provider, Fotizo facilitates
          the transaction and administers buyer protection; the contract for the goods or services
          themselves is between the buyer and that seller or provider.
        </p>
      </Section>

      <Section title="10. Changes to these terms">
        <p>
          We may update these terms as the platform changes. Material changes will be notified in
          advance where reasonably possible. Continuing to use Fotizo after a change takes effect
          means you accept the updated terms. The date at the top shows when this version was
          published.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          Questions about these terms, or about an order, go through our{" "}
          <Link href="/support">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              customer service page
            </span>
          </Link>
          . See also our{" "}
          <Link href="/privacy">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              Privacy Policy
            </span>
          </Link>{" "}
          and{" "}
          <Link href="/trust-safety">
            <span className="cursor-pointer font-semibold text-primary hover:underline">
              Trust &amp; Safety
            </span>
          </Link>{" "}
          pages.
        </p>
      </Section>
    </ContentPage>
  );
}
