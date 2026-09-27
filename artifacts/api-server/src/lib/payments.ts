import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  paymentAttemptsTable,
  paymentEventsTable,
  type OrderRow,
  type PaymentAttemptRow,
  type PaymentProvider,
} from "@workspace/db";
import { caseReference } from "./cases";
import { logger } from "./logger";
import { currentRates } from "../routes/currency";
import { configuredOrigins } from "../middlewares/security";

// Online payment: Paystack for Ghana (charged in GHS), Stripe for other
// markets (charged in GBP, the store's base currency). Configuration is read
// on each call so tests and deployments can change it without a restart.
const env = {
  paystackKey: () => process.env.PAYSTACK_SECRET_KEY ?? "",
  stripeKey: () => process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET ?? "",
  paystackApi: () => process.env.PAYSTACK_API_URL ?? "https://api.paystack.co",
  stripeApi: () => process.env.STRIPE_API_URL ?? "https://api.stripe.com",
  // Where customers return after paying: the storefront origin.
  appUrl: () => (process.env.APP_URL ?? configuredOrigins()[0]).replace(/\/+$/, ""),
};

/** Unpaid online orders are released after this long. */
export const PAYMENT_WINDOW_MS = 60 * 60 * 1000;

export class PaymentError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function providersAvailable() {
  return { paystack: Boolean(env.paystackKey()), stripe: Boolean(env.stripeKey()) };
}

/** Ghana pays locally through Paystack; everywhere else through Stripe. */
export function providerForCountry(country: string): PaymentProvider {
  return country === "GH" ? "paystack" : "stripe";
}

export function isOnlineMethod(method: string | null): method is PaymentProvider {
  return method === "paystack" || method === "stripe";
}

async function providerRequest(url: string, init: RequestInit, provider: PaymentProvider) {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    logger.warn({ provider, errorType: (error as Error)?.name }, "Payment provider unreachable");
    throw new PaymentError(502, "The payment provider could not be reached. Please try again.");
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    logger.warn({ provider, status: response.status }, "Payment provider rejected a request");
    throw new PaymentError(502, "The payment provider declined the request. Please try again.");
  }
  return body;
}

const paystackHeaders = () => ({
  Authorization: `Bearer ${env.paystackKey()}`,
  "Content-Type": "application/json",
});
const stripeHeaders = (idempotencyKey?: string) => ({
  Authorization: `Bearer ${env.stripeKey()}`,
  "Content-Type": "application/x-www-form-urlencoded",
  ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
});

/**
 * Opens a hosted checkout for an unpaid online order and records the attempt.
 * The amount is the server-priced order total; for Paystack it is converted to
 * GHS at the current rate, which is locked onto the attempt.
 */
export async function startPayment(order: OrderRow): Promise<{ checkoutUrl: string; attemptId: string }> {
  if (!isOnlineMethod(order.paymentMethod))
    throw new PaymentError(409, "This order is not paid online.");
  if (order.paymentStatus === "paid") throw new PaymentError(409, "This order is already paid.");
  const provider = order.paymentMethod;
  if (!providersAvailable()[provider])
    throw new PaymentError(503, "Online payment is not available right now. Choose another payment method.");
  const email = order.contactEmail;
  if (!email) throw new PaymentError(409, "This order has no contact email for the payment receipt.");

  let currency = "GBP";
  let rate = 1;
  if (provider === "paystack") {
    const rates = await currentRates();
    if (!rates) throw new PaymentError(503, "Cedi exchange rates are unavailable. Please try again shortly.");
    currency = "GHS";
    rate = rates.GHS;
  }
  const amountMinor = Math.round(order.total * rate * 100);
  const reference = caseReference("FZP");
  const [attempt] = await db
    .insert(paymentAttemptsTable)
    .values({ orderId: order.id, provider, reference, amountMinor, currency, exchangeRate: rate })
    .returning();
  const returnUrl = `${env.appUrl()}/order-confirmation?order=${order.id}`;

  try {
    let checkoutUrl: string;
    let sessionId: string | null = null;
    if (provider === "paystack") {
      const body = await providerRequest(
        `${env.paystackApi()}/transaction/initialize`,
        {
          method: "POST",
          headers: paystackHeaders(),
          body: JSON.stringify({
            email,
            amount: amountMinor,
            currency,
            reference,
            callback_url: returnUrl,
            metadata: { orderId: order.id, attemptId: attempt.id, orderReference: order.reference },
          }),
        },
        "paystack",
      );
      const data = body.data as { authorization_url?: string } | undefined;
      if (!data?.authorization_url) throw new PaymentError(502, "Paystack did not return a payment page.");
      checkoutUrl = data.authorization_url;
    } else {
      const form = new URLSearchParams({
        mode: "payment",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "gbp",
        "line_items[0][price_data][unit_amount]": String(amountMinor),
        "line_items[0][price_data][product_data][name]": `Fotizo order ${order.reference ?? order.id}`,
        success_url: `${returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: returnUrl,
        client_reference_id: order.id,
        customer_email: email,
        "metadata[orderId]": order.id,
        "metadata[attemptId]": attempt.id,
        "metadata[reference]": reference,
        expires_at: String(Math.floor((Date.now() + PAYMENT_WINDOW_MS) / 1000)),
      });
      const body = await providerRequest(
        `${env.stripeApi()}/v1/checkout/sessions`,
        { method: "POST", headers: stripeHeaders(attempt.id), body: form.toString() },
        "stripe",
      );
      if (typeof body.url !== "string" || typeof body.id !== "string")
        throw new PaymentError(502, "Stripe did not return a payment page.");
      checkoutUrl = body.url;
      sessionId = body.id;
    }
    await db
      .update(paymentAttemptsTable)
      .set({ checkoutUrl, providerSessionId: sessionId, updatedAt: new Date() })
      .where(eq(paymentAttemptsTable.id, attempt.id));
    return { checkoutUrl, attemptId: attempt.id };
  } catch (error) {
    await db
      .update(paymentAttemptsTable)
      .set({ status: "failed", failureReason: "Could not open checkout", updatedAt: new Date() })
      .where(eq(paymentAttemptsTable.id, attempt.id));
    throw error;
  }
}

type Observation = { succeeded: boolean; failed?: boolean; amountMinor?: number; currency?: string };

/**
 * Applies a provider's verdict to an attempt. Payment only counts when the
 * provider reports success for exactly the amount and currency we charged;
 * the order becomes paid in the same transaction. Repeats are harmless.
 */
export async function recordOutcome(attemptId: string, observed: Observation) {
  return db.transaction(async (tx) => {
    const [attempt] = await tx
      .select()
      .from(paymentAttemptsTable)
      .where(eq(paymentAttemptsTable.id, attemptId))
      .for("update");
    if (!attempt || attempt.status === "succeeded") return attempt;
    if (observed.succeeded) {
      const matches =
        observed.amountMinor === attempt.amountMinor &&
        observed.currency?.toUpperCase() === attempt.currency.toUpperCase();
      if (!matches) {
        logger.error(
          { attemptId, provider: attempt.provider },
          "Payment amount or currency did not match the attempt; not marking paid",
        );
        const [failed] = await tx
          .update(paymentAttemptsTable)
          .set({ status: "failed", failureReason: "Amount or currency mismatch", updatedAt: new Date() })
          .where(eq(paymentAttemptsTable.id, attempt.id))
          .returning();
        return failed;
      }
      const now = new Date();
      const [succeeded] = await tx
        .update(paymentAttemptsTable)
        .set({ status: "succeeded", completedAt: now, updatedAt: now })
        .where(eq(paymentAttemptsTable.id, attempt.id))
        .returning();
      const [order] = await tx
        .update(ordersTable)
        .set({ paymentStatus: "paid", paidAt: now })
        .where(and(eq(ordersTable.id, attempt.orderId), eq(ordersTable.paymentStatus, "unpaid")))
        .returning({ id: ordersTable.id });
      const [cancelled] = await tx
        .select({ id: orderItemsTable.id })
        .from(orderItemsTable)
        .where(and(eq(orderItemsTable.orderId, attempt.orderId), eq(orderItemsTable.status, "cancelled")))
        .limit(1);
      if (order && cancelled)
        logger.warn({ orderId: attempt.orderId }, "Payment arrived after the order was released; refund or re-fulfil");
      return succeeded;
    }
    if (observed.failed && attempt.status === "pending") {
      const [failed] = await tx
        .update(paymentAttemptsTable)
        .set({ status: "failed", failureReason: "Declined or abandoned at the provider", updatedAt: new Date() })
        .where(eq(paymentAttemptsTable.id, attempt.id))
        .returning();
      return failed;
    }
    return attempt;
  });
}

/**
 * Asks the provider directly about an attempt (used on return from checkout).
 * Failed attempts are re-checked too: both providers let the customer retry a
 * declined card on the same payment page.
 */
export async function verifyAttempt(attempt: PaymentAttemptRow) {
  if (attempt.status === "succeeded" || attempt.status === "expired") return attempt;
  if (attempt.provider === "paystack") {
    const body = await providerRequest(
      `${env.paystackApi()}/transaction/verify/${encodeURIComponent(attempt.reference)}`,
      { headers: paystackHeaders() },
      "paystack",
    );
    const data = (body.data ?? {}) as { status?: string; amount?: number; currency?: string };
    return recordOutcome(attempt.id, {
      succeeded: data.status === "success",
      // "abandoned" only means the customer has not finished yet.
      failed: data.status === "failed",
      amountMinor: data.amount,
      currency: data.currency,
    });
  }
  if (!attempt.providerSessionId) return attempt;
  const body = await providerRequest(
    `${env.stripeApi()}/v1/checkout/sessions/${encodeURIComponent(attempt.providerSessionId)}`,
    { headers: stripeHeaders() },
    "stripe",
  );
  return recordOutcome(attempt.id, {
    succeeded: body.payment_status === "paid",
    failed: body.status === "expired",
    amountMinor: typeof body.amount_total === "number" ? body.amount_total : undefined,
    currency: typeof body.currency === "string" ? body.currency : undefined,
  });
}

export async function latestAttempt(orderId: string) {
  const [attempt] = await db
    .select()
    .from(paymentAttemptsTable)
    .where(eq(paymentAttemptsTable.orderId, orderId))
    .orderBy(desc(paymentAttemptsTable.createdAt))
    .limit(1);
  return attempt;
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

/** Paystack signs the raw body with HMAC-SHA512 using the secret key. */
export function paystackSignatureValid(rawBody: Buffer, signature: string | undefined) {
  const key = env.paystackKey();
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

/** Stripe signs `${timestamp}.${rawBody}` with HMAC-SHA256; reject stale events. */
export function stripeSignatureValid(rawBody: Buffer, header: string | undefined, now = Date.now()) {
  const secret = env.stripeWebhookSecret();
  if (!secret || !header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  return parts.some(([k, v]) => k === "v1" && safeEqual(expected, v));
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Records a webhook delivery; false when it was already processed. */
export async function firstDelivery(provider: PaymentProvider, eventId: string, eventType: string) {
  const inserted = await db
    .insert(paymentEventsTable)
    .values({ provider, eventId, eventType })
    .onConflictDoNothing()
    .returning({ eventId: paymentEventsTable.eventId });
  return inserted.length > 0;
}

export async function attemptByReference(provider: PaymentProvider, reference: string) {
  const [attempt] = await db
    .select()
    .from(paymentAttemptsTable)
    .where(
      and(
        eq(paymentAttemptsTable.provider, provider),
        provider === "paystack"
          ? eq(paymentAttemptsTable.reference, reference)
          : eq(paymentAttemptsTable.providerSessionId, reference),
      ),
    );
  return attempt;
}

// ── Abandoned checkouts ──────────────────────────────────────────────────────

/**
 * Cancels online orders still unpaid after the payment window and puts their
 * marketplace stock back. Late provider confirmations are still recorded (and
 * logged for a refund or re-fulfilment decision).
 */
export async function releaseAbandonedOrders(now = Date.now()) {
  const cutoff = new Date(now - PAYMENT_WINDOW_MS);
  const stale = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        inArray(ordersTable.paymentMethod, ["paystack", "stripe"]),
        eq(ordersTable.paymentStatus, "unpaid"),
        lt(ordersTable.createdAt, cutoff),
      ),
    )
    .limit(200);
  let released = 0;
  for (const { id } of stale) {
    const changed = await db.transaction(async (tx) => {
      const lines = await tx
        .update(orderItemsTable)
        .set({ status: "cancelled" })
        .where(and(eq(orderItemsTable.orderId, id), eq(orderItemsTable.status, "pending")))
        .returning({ productId: orderItemsTable.productId, quantity: orderItemsTable.quantity });
      for (const line of lines)
        await tx
          .update(productsTable)
          .set({ stockCount: sql`${productsTable.stockCount} + ${line.quantity}` })
          .where(and(eq(productsTable.id, line.productId), eq(productsTable.channel, "marketplace")));
      await tx
        .update(paymentAttemptsTable)
        .set({ status: "expired", updatedAt: new Date() })
        .where(and(eq(paymentAttemptsTable.orderId, id), eq(paymentAttemptsTable.status, "pending")));
      return lines.length;
    });
    if (changed) released += 1;
  }
  return released;
}

/** Stops treating an attempt as open once the order has been cancelled. */
export async function orderIsOpen(orderId: string) {
  const [open] = await db
    .select({ id: orderItemsTable.id })
    .from(orderItemsTable)
    .where(and(eq(orderItemsTable.orderId, orderId), ne(orderItemsTable.status, "cancelled")))
    .limit(1);
  return Boolean(open);
}
