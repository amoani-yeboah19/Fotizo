import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  PackageSearch,
  MessageCircle,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Plane,
  Ship,
  CarFront,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  SUPPORT_CHANNELS,
  DELIVERY_WINDOWS,
  whatsappLink,
  hasAnyChannel,
} from "@/features/support/data/channels";
import {
  SUPPORT_TOPICS,
  submitSupportRequest,
  type SupportRequest,
  type SupportTopicId,
} from "@/features/support/services/support.service";

const FAQS: { q: string; a: string }[] = [
  {
    q: "My order hasn't arrived — what should I do?",
    a: `First check the expected window: air freight lands in about ${DELIVERY_WINDOWS.air} and sea freight takes ${DELIVERY_WINDOWS.sea} from dispatch. If you're past that window, open a request below with your order reference and we'll trace it with the hub directly. You won't be passed between departments.`,
  },
  {
    q: "How do I track an order?",
    a: "Your orders and their current status live in your dashboard under My Orders. If a tracking number has been issued it appears there. If the status hasn't moved in over a week, that's worth raising with us.",
  },
  {
    q: "Why does delivery take a few weeks?",
    a: "Shop orders are consolidated at our Guangzhou hub and shipped to Ghana. Air freight is faster and costs more; sea freight is cheaper and slower. Consolidating is what keeps prices down — the trade-off is the wait.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes. Every order is covered by buyer protection. If an item arrives damaged, wrong, or never arrives at all, raise it below with photos where relevant and we'll sort a refund or replacement.",
  },
  {
    q: "How long does a vehicle order take?",
    a: `Vehicles run to a different timetable — typically ${DELIVERY_WINDOWS.vehicles} from confirmed order to handover, covering production, sea freight, customs clearance and registration. Your sales contact updates you at each stage.`,
  },
  {
    q: "How do I reach a service provider I booked?",
    a: "Use Messages in your dashboard — that thread goes straight to the provider. If they aren't responding, raise it with us and we'll step in.",
  },
];

export default function SupportPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<SupportRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<SupportTopicId>("not-received");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const request = await submitSupportRequest({
        topic,
        orderRef: String(form.get("orderRef") ?? "").trim(),
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        message: String(form.get("message") ?? "").trim(),
      });
      setDone(request);
    } catch {
      setError("We couldn't send that just now. Please try again, or reach us on one of the channels above.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout mainClassName="pt-20">
      <section className="bg-gradient-to-r from-[#08275B] via-[#0a2f6e] to-[#FF6A00]">
        <div className="container-app py-14 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Customer Service</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">How can we help?</h1>
          <p className="mt-3 max-w-xl text-white/85">
            Chasing a package, returning something, or stuck on an order — tell us what's wrong and a
            real person will pick it up.
          </p>
        </div>
      </section>

      <div className="container-app py-12">
        {/* Where's my order — the reason most people land here */}
        <section className="rounded-2xl border border-border bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <PackageSearch className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold text-foreground">Where's my order?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your orders, their status and any tracking number are in your dashboard.
                </p>
              </div>
            </div>
            <Link href={user ? "/dashboard/buyer?tab=orders" : "/login"}>
              <Button size="lg" className="w-full shrink-0 sm:w-auto">
                {user ? "View my orders" : "Sign in to track"}
              </Button>
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3">
            <DeliveryWindow icon={Plane} label="Air freight" value={DELIVERY_WINDOWS.air} />
            <DeliveryWindow icon={Ship} label="Sea freight" value={DELIVERY_WINDOWS.sea} />
            <DeliveryWindow icon={CarFront} label="Vehicles" value={DELIVERY_WINDOWS.vehicles} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Measured from dispatch, not from when you ordered. Past the window? Raise it below —
            that's exactly what this page is for.
          </p>
        </section>

        {/* Direct channels — only rendered once real details are configured */}
        {hasAnyChannel(SUPPORT_CHANNELS) && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-foreground">Talk to us directly</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {SUPPORT_CHANNELS.whatsapp && (
                <ChannelCard
                  icon={MessageCircle}
                  title="WhatsApp"
                  detail="Usually the fastest"
                  href={whatsappLink(SUPPORT_CHANNELS.whatsapp, "Hi Fotizo, I need help with an order.")}
                />
              )}
              {SUPPORT_CHANNELS.phone && (
                <ChannelCard
                  icon={Phone}
                  title={SUPPORT_CHANNELS.phone}
                  detail={SUPPORT_CHANNELS.hours ?? "Call us"}
                  href={`tel:${SUPPORT_CHANNELS.phone.replace(/\s/g, "")}`}
                />
              )}
              {SUPPORT_CHANNELS.email && (
                <ChannelCard
                  icon={Mail}
                  title={SUPPORT_CHANNELS.email}
                  detail="We reply within one working day"
                  href={`mailto:${SUPPORT_CHANNELS.email}`}
                />
              )}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* FAQ */}
          <section>
            <h2 className="text-lg font-bold text-foreground">Common questions</h2>
            <div className="mt-4 space-y-2">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-border bg-white p-4 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-foreground group-open:text-primary">
                    {faq.q}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              More detail in our{" "}
              <Link href="/guides">
                <span className="cursor-pointer font-semibold text-primary hover:underline">guides</span>
              </Link>
              .
            </p>
          </section>

          {/* Request form */}
          <section id="raise" className="rounded-2xl border border-border bg-white p-6">
            {done ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-foreground">We've got it</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your reference is{" "}
                  <span className="font-mono font-bold text-foreground">{done.reference}</span>. Quote
                  it if you follow up. We'll come back to you within one working day.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => setDone(null)}>
                  Raise another issue
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-foreground">Raise an issue</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You don't need to be signed in, and you don't need the order reference if you can't
                  find it.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="support-topic">What's the problem?</Label>
                    <select
                      id="support-topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value as SupportTopicId)}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {SUPPORT_TOPICS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="support-order">Order reference (optional)</Label>
                    <Input id="support-order" name="orderRef" placeholder="e.g. FZ-4820" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="support-name">Your name</Label>
                    <Input id="support-name" name="name" required defaultValue={user?.name ?? ""} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="support-email">Email</Label>
                      <Input
                        id="support-email"
                        name="email"
                        type="email"
                        required
                        defaultValue={user?.email ?? ""}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="support-phone">Phone (optional)</Label>
                      <Input id="support-phone" name="phone" type="tel" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="support-message">What happened?</Label>
                    <Textarea
                      id="support-message"
                      name="message"
                      rows={5}
                      required
                      placeholder="Tell us what you ordered, when, and what's gone wrong."
                    />
                  </div>

                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? "Sending…" : "Send to customer service"}
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
}

function DeliveryWindow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Plane;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {value}
        </p>
      </div>
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  detail,
  href,
}: {
  icon: typeof Phone;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-primary/40"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
      </span>
    </a>
  );
}
