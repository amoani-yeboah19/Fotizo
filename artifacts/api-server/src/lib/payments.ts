import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, paymentAttemptsTable, readyToFulfil, type OrderRow, type PaymentAttemptRow } from "@workspace/db";
import { caseReference } from "./cases";
import { logger } from "./logger";
import { currentRates } from "../routes/currency";
import { recordUnitSaleFees } from "./fees";
import { configuredOrigins } from "../middlewares/security";
import { payazaReady, queryPayaza, PayazaError } from "./payaza";
export { PayazaError as PaymentError } from "./payaza";
export const PAYMENT_WINDOW_MS = 60 * 60 * 1000;
export type OnlineProvider = "payaza";
export const providersAvailable = () => ({ payaza: payazaReady() });
export const providerForCountry = (_country: string): OnlineProvider => "payaza";
export function isOnlineMethod(method: string | null): boolean {
  return ["payaza", "stripe", "paystack", "dlocal"].includes(method ?? "");
}

export async function startPayment(order: OrderRow): Promise<{ checkoutUrl: string; attemptId: string }> {
  if (!isOnlineMethod(order.paymentMethod)) throw new PayazaError(409, "This order is not paid online.");
  if (order.paymentStatus === "paid") throw new PayazaError(409, "This order is already paid.");
  if (!readyToFulfil(order)) throw new PayazaError(409, "Accept the confirmed total before paying.");
  if (!payazaReady()) throw new PayazaError(503, "Payaza payment is temporarily unavailable. Please try again later.");
  if (!order.contactEmail || !order.contactPhone) throw new PayazaError(409, "A contact email and phone number are required.");
  const existing = await latestAttempt(order.id);
  if (existing?.provider === "payaza" && existing.status === "pending" && existing.checkoutUrl)
    return { checkoutUrl: existing.checkoutUrl, attemptId: existing.id };
  // Payaza supports GHS collections locally and USD international card collections.
  const currency = order.country === "GH" ? "GHS" : "USD";
  const rates = await currentRates();
  const rate = rates?.[currency];
  if (!rate) throw new PayazaError(503, "Exchange rates are unavailable. Please try again shortly.");
  const amountMinor = Math.round(order.total * rate * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new PayazaError(409, "Invalid payment amount.");
  return db.transaction(async (tx) => {
    // Serialize concurrent retry clicks for the same order.
    const [current] = await tx.select().from(ordersTable).where(eq(ordersTable.id, order.id)).for("update");
    if (!current || current.paymentStatus !== "unpaid") throw new PayazaError(409, "This order is already paid.");
    const [pending] = await tx.select().from(paymentAttemptsTable).where(and(eq(paymentAttemptsTable.orderId, order.id), eq(paymentAttemptsTable.provider, "payaza"), eq(paymentAttemptsTable.status, "pending"))).orderBy(desc(paymentAttemptsTable.createdAt)).limit(1);
    if (pending?.checkoutUrl) return { checkoutUrl: pending.checkoutUrl, attemptId: pending.id };
    const reference = caseReference("FZP");
    const [attempt] = await tx.insert(paymentAttemptsTable).values({ orderId: order.id, provider: "payaza", reference, amountMinor, currency, exchangeRate: rate }).returning();
    const origin = (process.env.APP_URL ?? configuredOrigins()[0]).replace(/\/+$/, "");
    const checkoutUrl = origin + "/payaza-checkout?order=" + order.id + "&attempt=" + attempt.id;
    await tx.update(paymentAttemptsTable).set({ checkoutUrl, updatedAt: new Date() }).where(eq(paymentAttemptsTable.id, attempt.id));
    return { checkoutUrl, attemptId: attempt.id };
  });
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
      // Seller fees in the currency actually charged, once per order line.
      if (order) await recordUnitSaleFees(tx, attempt.orderId, { currency: attempt.currency, exchangeRate: attempt.exchangeRate });
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

/** Only the authenticated provider query can settle a Payaza attempt. */
export async function verifyAttempt(attempt: PaymentAttemptRow) {
  if (attempt.status === "succeeded" || attempt.provider !== "payaza") return attempt;
  const payment = await queryPayaza(attempt.reference);
  if (!payment) return attempt;
  return recordOutcome(attempt.id, payment);
}
export async function attemptByReference(reference: string) {
  const [attempt] = await db.select().from(paymentAttemptsTable).where(and(eq(paymentAttemptsTable.provider, "payaza"), eq(paymentAttemptsTable.reference, reference)));
  return attempt;
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

// ── Abandoned checkouts ──────────────────────────────────────────────────────

/**
 * Cancels an order's pending lines and puts their marketplace stock back.
 * Returns how many lines were cancelled.
 */
export async function releaseOrderLines(tx: Tx, orderId: string) {
  const lines = await tx
    .update(orderItemsTable)
    .set({ status: "cancelled" })
    .where(and(eq(orderItemsTable.orderId, orderId), eq(orderItemsTable.status, "pending")))
    .returning({ productId: orderItemsTable.productId, quantity: orderItemsTable.quantity });
  for (const line of lines)
    await tx
      .update(productsTable)
      .set({ stockCount: sql`${productsTable.stockCount} + ${line.quantity}` })
      .where(and(eq(productsTable.id, line.productId), eq(productsTable.channel, "marketplace")));
  return lines.length;
}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Cancels online orders still unpaid after the payment window and puts their
 * marketplace stock back. For orders that needed supplier confirmation the
 * window starts when the buyer accepted the confirmed total. Late provider
 * confirmations are still recorded (and logged for a refund or re-fulfilment
 * decision). Confirmed quotes the buyer has not accepted in time expire too.
 */
export async function releaseAbandonedOrders(now = Date.now()) {
  const cutoff = new Date(now - PAYMENT_WINDOW_MS);
  const stale = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        inArray(ordersTable.paymentMethod, ["payaza", "paystack", "stripe", "dlocal"]),
        eq(ordersTable.paymentStatus, "unpaid"),
        sql`(${ordersTable.confirmationStatus} IS NULL OR ${ordersTable.confirmationStatus} = 'accepted')`,
        lt(sql`coalesce(${ordersTable.acceptedAt}, ${ordersTable.createdAt})`, cutoff),
      ),
    )
    .limit(200);
  let released = 0;
  for (const { id } of stale) {
    const changed = await db.transaction(async (tx) => {
      const lines = await releaseOrderLines(tx, id);
      await tx
        .update(paymentAttemptsTable)
        .set({ status: "expired", updatedAt: new Date() })
        .where(and(eq(paymentAttemptsTable.orderId, id), eq(paymentAttemptsTable.status, "pending")));
      return lines;
    });
    if (changed) released += 1;
  }
  return released + (await expireQuotes(now));
}

/** Confirmed quotes left unanswered past their expiry are closed and their stock released. */
export async function expireQuotes(now = Date.now()) {
  const expired = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.confirmationStatus, "quoted"), lt(ordersTable.quoteExpiresAt, new Date(now))))
    .limit(200);
  let closed = 0;
  for (const { id } of expired) {
    const changed = await db.transaction(async (tx) => {
      const [order] = await tx
        .update(ordersTable)
        .set({ confirmationStatus: "expired" })
        .where(and(eq(ordersTable.id, id), eq(ordersTable.confirmationStatus, "quoted")))
        .returning({ id: ordersTable.id });
      if (order) await releaseOrderLines(tx, id);
      return Boolean(order);
    });
    if (changed) closed += 1;
  }
  return closed;
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
