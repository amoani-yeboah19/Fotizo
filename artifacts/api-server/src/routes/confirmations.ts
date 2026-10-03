import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  usersTable,
  QUOTE_VALID_DAYS,
  type ConfirmationStatus,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { PaymentError, isOnlineMethod, releaseOrderLines, startPayment } from "../lib/payments";
import { confirmation, toPublicOrder } from "./orders";

// Supplier confirmation for imported goods. Shop listings carry estimated
// prices; before the buyer pays, Fotizo checks the requested options, the
// final price, the supplier's minimum order and delivery, and sends a
// confirmed quote. The buyer then accepts it (and pays) or cancels.
//
//   awaiting --quote--> quoted --accept--> accepted (payment, fulfilment)
//   awaiting/quoted --decline--> declined      (Fotizo)
//   awaiting/quoted --withdraw--> withdrawn    (buyer)
//   quoted --(not accepted within QUOTE_VALID_DAYS)--> expired
const router: IRouter = Router();
const round2 = (n: number) => Math.round(n * 100) / 100;
const OPEN: ConfirmationStatus[] = ["awaiting", "quoted"];
const orderId = z.string().uuid();

// ── Buyer ────────────────────────────────────────────────────────────────────

// Accepts the confirmed items and total. Online orders go straight on to the
// payment provider; the 60-minute payment window starts now.
router.post("/orders/:id/accept", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = orderId.safeParse(req.params.id);
  const [order] = id.success
    ? await db
        .update(ordersTable)
        .set({ confirmationStatus: "accepted", acceptedAt: new Date() })
        .where(
          and(
            eq(ordersTable.id, id.data),
            eq(ordersTable.buyerId, req.auth!.userId),
            eq(ordersTable.confirmationStatus, "quoted"),
            gt(ordersTable.quoteExpiresAt, new Date()),
          ),
        )
        .returning()
    : [];
  if (!order) {
    res.status(409).json({ error: "This quote can no longer be accepted. Refresh to see the order's latest status." });
    return;
  }
  if (!isOnlineMethod(order.paymentMethod)) {
    res.json(confirmation(order));
    return;
  }
  try {
    const { checkoutUrl } = await startPayment(order);
    res.json(confirmation(order, { checkoutUrl }));
  } catch (error) {
    if (!(error instanceof PaymentError)) throw error;
    // Accepted either way; the buyer can open payment again from the order page.
    res.json(confirmation(order, { checkoutUrl: null, paymentError: error.message }));
  }
});

// The buyer cancels before paying: while Fotizo is confirming, or instead of
// accepting the quote.
router.post("/orders/:id/withdraw", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = orderId.safeParse(req.params.id);
  const order = id.success
    ? await db.transaction(async (tx) => {
        const [withdrawn] = await tx
          .update(ordersTable)
          .set({ confirmationStatus: "withdrawn" })
          .where(
            and(
              eq(ordersTable.id, id.data),
              eq(ordersTable.buyerId, req.auth!.userId),
              eq(ordersTable.paymentStatus, "unpaid"),
              inArray(ordersTable.confirmationStatus, OPEN),
            ),
          )
          .returning();
        if (withdrawn) await releaseOrderLines(tx, withdrawn.id);
        return withdrawn;
      })
    : undefined;
  if (!order) {
    res.status(409).json({ error: "This order can no longer be cancelled here. Refresh to see its latest status." });
    return;
  }
  res.json(confirmation(order));
});

// ── Fotizo (China representative and managers) ───────────────────────────────

const staff = requireRole("china_representative", "manager");

/** Supplier terms for a product, as recorded when it was imported. */
function supplierTerms(p: typeof productsTable.$inferSelect | null) {
  if (!p) return null;
  const specs = (p.specs ?? {}) as Record<string, string>;
  return {
    platform: p.sourcePlatform,
    productId: p.sourceProductId,
    sourceUrl: p.sourceUrl ?? specs.supplierListing ?? null,
    priceRange: specs.priceRange ?? null,
    minimumOrder: specs.minimumOrder ?? null,
    unit: specs.unit ?? null,
    supplierCurrency: p.supplierCurrency,
    supplierCost: p.supplierCost,
    supplierRate: p.supplierRate,
  };
}

// The confirmation queue: open requests first (oldest first), or one status.
router.get("/operations/confirmations", requireAuth, staff, async (req, res) => {
  const status = z.enum(["open", "awaiting", "quoted", "accepted", "declined", "withdrawn", "expired"]).catch("open").parse(req.query.status);
  const orders = await db
    .select({ order: ordersTable, buyer: usersTable.name })
    .from(ordersTable)
    .innerJoin(usersTable, eq(usersTable.id, ordersTable.buyerId))
    .where(status === "open" ? inArray(ordersTable.confirmationStatus, OPEN) : eq(ordersTable.confirmationStatus, status))
    .orderBy(asc(ordersTable.createdAt))
    .limit(100);
  const ids = orders.map((o) => o.order.id);
  const lines = ids.length
    ? await db
        .select({ item: orderItemsTable, product: productsTable })
        .from(orderItemsTable)
        .leftJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
        .where(inArray(orderItemsTable.orderId, ids))
        .orderBy(asc(orderItemsTable.productTitle))
    : [];
  res.json(
    orders.map(({ order, buyer }) => ({
      ...confirmation(order),
      createdAt: order.createdAt.toISOString(),
      quotedAt: order.quotedAt?.toISOString() ?? null,
      buyer: { name: buyer, email: order.contactEmail, phone: order.contactPhone },
      delivery: { city: order.city, country: order.country },
      items: lines
        .filter((l) => l.item.orderId === order.id)
        .map((l) => ({ ...toPublicOrder(l.item, order), supplier: l.item.needsConfirmation ? supplierTerms(l.product) : null })),
    })),
  );
});

const quoteSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            // Confirmed unit price in GBP, including Fotizo's margin.
            price: z.number().positive().max(100_000),
            confirmedOptions: z.string().trim().max(300).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    shipping: z.number().min(0).max(10_000),
    deliveryDaysMin: z.number().int().min(0).max(365),
    deliveryDaysMax: z.number().int().min(0).max(365),
    note: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((q) => q.deliveryDaysMax >= q.deliveryDaysMin, { message: "Delivery days are reversed." });

// Sends (or revises) the confirmed quote: final unit prices for the imported
// lines, the delivery fee and delivery time. Other lines keep their price.
router.post("/operations/orders/:id/quote", requireAuth, staff, async (req: AuthenticatedRequest, res) => {
  const id = orderId.safeParse(req.params.id);
  const body = quoteSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({
      error: "Give a price for every imported item, a delivery fee and a delivery time (the longest at least the shortest).",
    });
    return;
  }
  const quote = body.data;
  const outcome = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id.data), inArray(ordersTable.confirmationStatus, OPEN)))
      .for("update");
    if (!order) return { status: 409 as const, error: "This order is not waiting for a quote. Refresh and try again." };
    const lines = await tx.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const sourced = lines.filter((l) => l.needsConfirmation && l.status === "pending");
    const quoted = new Map(quote.items.map((i) => [i.id, i]));
    if (quoted.size !== quote.items.length || sourced.length !== quoted.size || sourced.some((l) => !quoted.has(l.id)))
      return { status: 400 as const, error: "Quote every imported item in this order exactly once." };
    for (const line of sourced) {
      const q = quoted.get(line.id)!;
      await tx
        .update(orderItemsTable)
        .set({ price: round2(q.price), confirmedOptions: q.confirmedOptions || line.requestedOptions })
        .where(eq(orderItemsTable.id, line.id));
    }
    const subtotal = round2(
      lines
        .filter((l) => l.status !== "cancelled")
        .reduce((sum, l) => sum + (quoted.get(l.id)?.price ?? l.price) * l.quantity, 0),
    );
    const shipping = round2(quote.shipping);
    const now = new Date();
    const [updated] = await tx
      .update(ordersTable)
      .set({
        confirmationStatus: "quoted",
        confirmationNote: quote.note || null,
        subtotal,
        shipping,
        total: round2(subtotal + shipping),
        deliveryDaysMin: quote.deliveryDaysMin,
        deliveryDaysMax: quote.deliveryDaysMax,
        quotedAt: now,
        quotedBy: req.auth!.userId,
        quoteExpiresAt: new Date(now.getTime() + QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000),
      })
      .where(eq(ordersTable.id, order.id))
      .returning();
    return { status: 200 as const, order: updated };
  });
  if (outcome.status !== 200) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }
  res.json(confirmation(outcome.order));
});

// Fotizo cannot supply the order (unavailable, minimum too high, and so on).
router.post("/operations/orders/:id/decline", requireAuth, staff, async (req: AuthenticatedRequest, res) => {
  const id = orderId.safeParse(req.params.id);
  const body = z.object({ reason: z.string().trim().min(3).max(1000) }).strict().safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: "Tell the buyer why the order can't be supplied (3-1000 characters)." });
    return;
  }
  const order = await db.transaction(async (tx) => {
    const [declined] = await tx
      .update(ordersTable)
      .set({ confirmationStatus: "declined", confirmationNote: body.data.reason })
      .where(
        and(
          eq(ordersTable.id, id.data),
          eq(ordersTable.paymentStatus, "unpaid"),
          inArray(ordersTable.confirmationStatus, OPEN),
        ),
      )
      .returning();
    if (declined) await releaseOrderLines(tx, declined.id);
    return declined;
  });
  if (!order) {
    res.status(409).json({ error: "This order is not waiting for confirmation. Refresh and try again." });
    return;
  }
  res.json(confirmation(order));
});

export default router;
