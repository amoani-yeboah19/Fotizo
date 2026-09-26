import express, { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import {
  PaymentError,
  attemptByReference,
  firstDelivery,
  isOnlineMethod,
  latestAttempt,
  orderIsOpen,
  paystackSignatureValid,
  providersAvailable,
  recordOutcome,
  startPayment,
  stripeSignatureValid,
  verifyAttempt,
} from "../lib/payments";
import { logger } from "../lib/logger";

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

paymentWebhooks.post("/paystack", async (req, res) => {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !paystackSignatureValid(raw, req.get("x-paystack-signature"))) {
    res.status(401).json({ error: "Invalid signature." });
    return;
  }
  const event = JSON.parse(raw.toString("utf8")) as {
    event?: string;
    data?: { id?: number | string; reference?: string; status?: string; amount?: number; currency?: string };
  };
  const data = event.data ?? {};
  if (!event.event || !data.reference) {
    res.sendStatus(200);
    return;
  }
  if (!(await firstDelivery("paystack", `${event.event}:${data.id ?? data.reference}`, event.event))) {
    res.sendStatus(200);
    return;
  }
  const attempt = await attemptByReference("paystack", data.reference);
  if (attempt && (event.event === "charge.success" || event.event === "charge.failed"))
    await recordOutcome(attempt.id, {
      succeeded: event.event === "charge.success" && data.status === "success",
      failed: event.event === "charge.failed",
      amountMinor: data.amount,
      currency: data.currency,
    });
  else if (!attempt) logger.warn({ provider: "paystack" }, "Webhook for an unknown payment reference");
  res.sendStatus(200);
});

paymentWebhooks.post("/stripe", async (req, res) => {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !stripeSignatureValid(raw, req.get("stripe-signature"))) {
    res.status(401).json({ error: "Invalid signature." });
    return;
  }
  const event = JSON.parse(raw.toString("utf8")) as {
    id?: string;
    type?: string;
    data?: {
      object?: { id?: string; payment_status?: string; amount_total?: number; currency?: string };
    };
  };
  const session = event.data?.object ?? {};
  if (!event.id || !event.type || !session.id) {
    res.sendStatus(200);
    return;
  }
  if (!(await firstDelivery("stripe", event.id, event.type))) {
    res.sendStatus(200);
    return;
  }
  const attempt = await attemptByReference("stripe", session.id);
  const handled = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
  ];
  if (attempt && handled.includes(event.type))
    await recordOutcome(attempt.id, {
      succeeded: event.type !== "checkout.session.expired" && event.type !== "checkout.session.async_payment_failed" && session.payment_status === "paid",
      failed: event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed",
      amountMinor: session.amount_total,
      currency: session.currency,
    });
  else if (!attempt) logger.warn({ provider: "stripe" }, "Webhook for an unknown checkout session");
  res.sendStatus(200);
});

export default router;
