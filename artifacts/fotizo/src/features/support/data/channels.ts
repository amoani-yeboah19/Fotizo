// ─────────────────────────────────────────────────────────────────────────────
// FILL THESE IN before launch. Every channel is null by default and a null
// channel is simply not rendered, so the support page never shows a phone
// number or WhatsApp link that doesn't reach anyone. Publishing a wrong contact
// is worse than publishing none — a customer chasing a missing package who
// calls a dead number is a customer you've lost twice.
// ─────────────────────────────────────────────────────────────────────────────

export interface SupportChannel {
  /** International format, digits only, no + or spaces — e.g. "233240000000". */
  whatsapp: string | null;
  /** Display form, e.g. "+233 24 000 0000". Used for the tel: link too. */
  phone: string | null;
  email: string | null;
  /** Local opening hours, shown next to the phone line. */
  hours: string | null;
}

export const SUPPORT_CHANNELS: SupportChannel = {
  whatsapp: null,
  phone: null,
  email: null,
  hours: null,
};

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function hasAnyChannel(c: SupportChannel): boolean {
  return Boolean(c.whatsapp || c.phone || c.email);
}

// Every delivery window we quote to a customer, in one place. The shop notice,
// the support FAQ, How It Works, the About page and the nav all read from here
// — otherwise the same promise drifts into four slightly different numbers and
// support ends up arguing about which one the customer saw.
export const DELIVERY_WINDOWS = {
  air: "5–10 days",
  sea: "2–3 weeks",
  /** Headline range covering both freight modes, for short marketing copy. */
  shop: "7–21 days",
  vehicles: "8–16 weeks",
} as const;
