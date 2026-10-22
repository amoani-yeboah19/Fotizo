import express, { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, ordersTable, paymentAttemptsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import {
  PaymentError,
  attemptByReference,
  isOnlineMethod,
  latestAttempt,
  orderIsOpen,
  providersAvailable,
  startPayment,
  verifyAttempt,
} from "../lib/payments";
import { payazaMode, payazaSignatureValid, payazaReady } from "../lib/payaza";

const router: IRouter = Router();

// Which online providers this deployment can use; the checkout hides the rest.
router.get("/payments/config", (_req, res) => {
  res.json(providersAvailable());
});

async function ownedOrder(req: AuthenticatedRequest) {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return undefined;
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id.data), eq(ordersTable.buyerId, req.auth!.userId)));
  return order;
}

function sendPaymentError(res: express.Response, error: unknown) {
  if (error instanceof PaymentError) {
    res.status(error.status).json({ error: error.message });
    return true;
  }
  return false;
}

// Opens (or reopens) the provider's payment page for an unpaid online order.
router.post("/payments/orders/:id/start", requireAuth, async (req: AuthenticatedRequest, res) => {
  const order = await ownedOrder(req);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  if (!(await orderIsOpen(order.id))) {
    res.status(409).json({ error: "This order was cancelled because payment was not completed in time." });
    return;
  }
  try {
    const { checkoutUrl } = await startPayment(order);
    res.json({ checkoutUrl });
  } catch (error) {
    if (!sendPaymentError(res, error)) throw error;
  }
});

// Called when the customer returns from checkout: asks the provider directly,
// so payment is confirmed even where webhooks cannot reach this server.
router.post("/payments/orders/:id/verify", requireAuth, async (req: AuthenticatedRequest, res) => {
  const order = await ownedOrder(req);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const attempt = isOnlineMethod(order.paymentMethod) ? await latestAttempt(order.id) : undefined;
  let attemptStatus = attempt?.status ?? null;
  if (attempt && order.paymentStatus === "unpaid") {
    try {
      attemptStatus = (await verifyAttempt(attempt))?.status ?? attemptStatus;
    } catch (error) {
      if (!sendPaymentError(res, error)) throw error;
      return;
    }
  }
  const [current] = await db
    .select({ paymentStatus: ordersTable.paymentStatus })
    .from(ordersTable)
    .where(eq(ordersTable.id, order.id));
  res.json({ paymentStatus: current.paymentStatus, attemptStatus, orderOpen: await orderIsOpen(order.id) });
});

// ── Provider webhooks ────────────────────────────────────────────────────────
// Server-to-server: mounted before the JSON parser and the browser-origin
// check, authenticated by the provider signature over the raw body instead.
export const paymentWebhooks: IRouter = Router();
paymentWebhooks.use(express.raw({ type: "*/*", limit: "1mb" }));

paymentWebhooks.post("/payaza", async (req, res) => {
  const raw = req.body;
  if (!Buffer.isBuffer(raw) || !payazaSignatureValid(raw, req.get("x-payaza-signature"))) {
    res.status(401).json({ error: "Invalid signature." }); return;
  }
  let event;
  try { event = JSON.parse(raw.toString("utf8")); } catch { res.status(400).json({ error: "Invalid JSON." }); return; }
  const reference = event?.merchant_reference;
  if (typeof reference !== "string") { res.sendStatus(200); return; }
  const attempt = await attemptByReference(reference);
  // Query the provider, then commit. A failed query returns an error so delivery
  // can be retried; recordOutcome locks the attempt and applies fees only once.
  if (attempt) await verifyAttempt(attempt);
  res.sendStatus(200);
});

router.get("/payments/orders/:id/checkout/:attemptId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const order = await ownedOrder(req);
  const id = z.string().uuid().safeParse(req.params.attemptId);
  if (!order || !id.success) { res.sendStatus(404); return; }
  const [attempt] = await db.select().from(paymentAttemptsTable).where(and(eq(paymentAttemptsTable.id, id.data), eq(paymentAttemptsTable.orderId, order.id), eq(paymentAttemptsTable.provider, "payaza")));
  if (!attempt) { res.sendStatus(404); return; }
  if (order.paymentStatus !== "unpaid" || attempt.status !== "pending" || !(await orderIsOpen(order.id))) {
    res.status(409).json({ error: "This payment is no longer open." }); return;
  }
  if (!payazaReady()) { res.status(503).json({ error: "Payaza is temporarily unavailable." }); return; }
  const names = (order.contactName ?? "Fotizo customer").trim().split(/\s+/);
  let phone = (order.contactPhone ?? "").replace(/[^0-9+]/g, "");
  if (!phone.startsWith("+")) {
    const prefix = order.country === "GH" ? "233" : order.country === "GB" ? "44" : "1";
    if (!phone.startsWith(prefix)) phone = prefix + phone.replace(/^0/, "");
    phone = "+" + phone;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ merchant_key: process.env.PAYAZA_PUBLIC_KEY, connection_mode: payazaMode(), checkout_amount: attempt.amountMinor / 100, currency_code: attempt.currency, transaction_reference: attempt.reference, email_address: order.contactEmail, first_name: names[0], last_name: names.slice(1).join(" ") || names[0], phone_number: phone });
});
export default router;
