import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  usersTable,
  PAYMENT_METHODS,
  cartItemsTable,
  type OrderItemRow,
  type OrderRow,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { caseReference } from "../lib/cases";
import {
  PaymentError,
  isOnlineMethod,
  latestAttempt,
  providerForCountry,
  providersAvailable,
  startPayment,
} from "../lib/payments";

const router: IRouter = Router();

function toPublicOrder(item: OrderItemRow, order: Pick<OrderRow, "createdAt" | "reference" | "paymentStatus" | "paymentMethod">) {
  return {
    id: item.id,
    orderId: item.orderId,
    reference: order.reference,
    productId: item.productId,
    productTitle: item.productTitle,
    productImage: item.productImage,
    seller: item.seller,
    price: item.price,
    quantity: item.quantity,
    status: item.status,
    date: order.createdAt.toISOString().split("T")[0],
    trackingNumber: item.trackingNumber,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
  };
}

const orderColumns = {
  createdAt: ordersTable.createdAt,
  reference: ordersTable.reference,
  paymentStatus: ordersTable.paymentStatus,
  paymentMethod: ordersTable.paymentMethod,
};

// Purchases — items the caller bought. Anyone can buy on Fotizo (a seller
// shopping from other sellers is a buyer here), so this is scoped by buyerId.
router.get("/orders", requireAuth, async (req: AuthenticatedRequest, res) => {
  const rows = await db
    .select({ item: orderItemsTable, order: orderColumns })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.buyerId, req.auth!.userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(500);
  res.json(rows.map((r) => toPublicOrder(r.item, r.order)));
});

// Sales — items bought FROM the caller (their fulfilment queue), scoped by the
// per-line sellerId so it is correct for mixed-seller orders.
router.get("/sales", requireAuth, async (req: AuthenticatedRequest, res) => {
  const rows = await db
    .select({ item: orderItemsTable, order: orderColumns })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(orderItemsTable.sellerId, req.auth!.userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(500);
  res.json(rows.map((r) => toPublicOrder(r.item, r.order)));
});

// Delivery is free above this subtotal (GBP); otherwise a flat fee applies.
// Computed here so the stored total is the one the buyer confirmed.
const FREE_DELIVERY_OVER = 50;
const DELIVERY_FEE = 5.99;
const round2 = (n: number) => Math.round(n * 100) / 100;

const placeOrderSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.string().uuid(),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(50)
      .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
        message: "Each product may appear once.",
      }),
    delivery: z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(254),
        phone: z.string().trim().min(5).max(40),
        addressLine1: z.string().trim().min(1).max(200),
        addressLine2: z.string().trim().max(200).default(""),
        city: z.string().trim().min(1).max(100),
        postalCode: z.string().trim().max(20).default(""),
        country: z.enum(["GH", "GB", "US"]),
      })
      .strict(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

class CheckoutError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function findByKey(buyerId: string, key: string) {
  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.buyerId, buyerId), eq(ordersTable.idempotencyKey, key)));
  return existing;
}

const confirmation = (order: OrderRow, checkout?: { checkoutUrl: string | null; paymentError?: string }) => ({
  ...checkout,
  orderId: order.id,
  reference: order.reference,
  subtotal: order.subtotal,
  shipping: order.shipping,
  total: order.total,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
});

// Places an order for offline payment. Prices, availability and delivery are
// decided here, never by the browser. Marketplace sellers hold stock, which is
// reserved in the same transaction; Fotizo Shop goods are sourced to order.
router.post("/orders", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = placeOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Check your delivery details, payment method and cart quantities (1-99 per item).",
    });
    return;
  }
  const buyerId = req.auth!.userId;
  const input = parsed.data;
  // Online payment goes through the provider for the delivery country and
  // must be configured before any stock is reserved.
  if (isOnlineMethod(input.paymentMethod)) {
    if (input.paymentMethod !== providerForCountry(input.delivery.country)) {
      res.status(400).json({ error: "Choose the online payment option offered for your country." });
      return;
    }
    if (!providersAvailable()[input.paymentMethod]) {
      res.status(503).json({ error: "Online payment is not available right now. Choose another payment method." });
      return;
    }
  }
  const previous = await findByKey(buyerId, input.idempotencyKey);
  if (previous) {
    // A retried submission returns the same order and its open checkout page.
    const attempt = isOnlineMethod(previous.paymentMethod) ? await latestAttempt(previous.id) : undefined;
    res.json(
      confirmation(previous, attempt ? { checkoutUrl: attempt.status === "pending" ? attempt.checkoutUrl : null } : undefined),
    );
    return;
  }
  try {
    const order = await db.transaction(async (tx) => {
      const ids = input.items.map((i) => i.productId);
      const products = await tx
        .select({ product: productsTable, sellerName: usersTable.name })
        .from(productsTable)
        .innerJoin(usersTable, eq(usersTable.id, productsTable.sellerId))
        .where(inArray(productsTable.id, ids))
        .orderBy(productsTable.id)
        .for("update", { of: productsTable });
      const byId = new Map(products.map((p) => [p.product.id, p]));
      const lines = input.items.map((item) => {
        const found = byId.get(item.productId);
        if (!found || found.product.status !== "active")
          throw new CheckoutError(409, "An item in your cart is no longer available. Remove it and try again.");
        if (found.product.sellerId === buyerId)
          throw new CheckoutError(409, `You cannot buy your own listing: ${found.product.title}.`);
        if (found.product.channel === "marketplace" && found.product.stockCount < item.quantity)
          throw new CheckoutError(
            409,
            `Only ${found.product.stockCount} of "${found.product.title}" left. Update your cart and try again.`,
          );
        return { ...found, quantity: item.quantity };
      });
      const subtotal = round2(lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0));
      const shipping = subtotal > FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
      const [created] = await tx
        .insert(ordersTable)
        .values({
          buyerId,
          reference: caseReference("FTZ"),
          subtotal,
          shipping,
          total: round2(subtotal + shipping),
          contactName: input.delivery.name,
          contactEmail: input.delivery.email.toLowerCase(),
          contactPhone: input.delivery.phone,
          addressLine1: input.delivery.addressLine1,
          addressLine2: input.delivery.addressLine2,
          city: input.delivery.city,
          postalCode: input.delivery.postalCode,
          country: input.delivery.country,
          paymentMethod: input.paymentMethod,
          idempotencyKey: input.idempotencyKey,
        })
        .returning();
      await tx.insert(orderItemsTable).values(
        lines.map((l) => ({
          orderId: created.id,
          productId: l.product.id,
          productTitle: l.product.title,
          productImage: l.product.images[0] ?? "",
          sellerId: l.product.sellerId,
          seller: l.sellerName,
          price: l.product.price,
          quantity: l.quantity,
        })),
      );
      // Ordered products leave the saved cart with the order.
      await tx
        .delete(cartItemsTable)
        .where(and(eq(cartItemsTable.userId, buyerId), inArray(cartItemsTable.productId, ids)));
      for (const l of lines)
        if (l.product.channel === "marketplace")
          await tx
            .update(productsTable)
            .set({ stockCount: sql`${productsTable.stockCount} - ${l.quantity}` })
            .where(eq(productsTable.id, l.product.id));
      return created;
    });
    if (!isOnlineMethod(order.paymentMethod)) {
      res.status(201).json(confirmation(order));
      return;
    }
    // The order exists either way; if the provider is unavailable the buyer can
    // retry payment from the order page before the payment window closes.
    try {
      const { checkoutUrl } = await startPayment(order);
      res.status(201).json(confirmation(order, { checkoutUrl }));
    } catch (error) {
      if (!(error instanceof PaymentError)) throw error;
      res.status(201).json(confirmation(order, { checkoutUrl: null, paymentError: error.message }));
    }
  } catch (error) {
    if (error instanceof CheckoutError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    // A concurrent retry with the same key committed first: return that order.
    const raced = await findByKey(buyerId, input.idempotencyKey);
    if (raced) {
      res.json(confirmation(raced));
      return;
    }
    throw error;
  }
});

// One order for its buyer: the confirmation page and order detail.
router.get("/orders/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const [order] = id.success
    ? await db
        .select()
        .from(ordersTable)
        .where(and(eq(ordersTable.id, id.data), eq(ordersTable.buyerId, req.auth!.userId)))
    : [];
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  res.json({
    ...confirmation(order),
    createdAt: order.createdAt.toISOString(),
    delivery: {
      name: order.contactName,
      phone: order.contactPhone,
      addressLine1: order.addressLine1,
      addressLine2: order.addressLine2,
      city: order.city,
      postalCode: order.postalCode,
      country: order.country,
    },
    items: items.map((i) => toPublicOrder(i, order)),
  });
});

// Seller fulfilment: each line moves forward independently, since a
// mixed-seller order ships from several places.
const LINE_TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
const lineStatusSchema = z
  .object({
    status: z.enum(["processing", "shipped", "delivered", "cancelled"]),
    trackingNumber: z.string().trim().max(100).optional(),
  })
  .strict();

router.post("/sales/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const body = lineStatusSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: "Choose a valid status; tracking numbers are up to 100 characters." });
    return;
  }
  const outcome = await db.transaction(async (tx) => {
    const [line] = await tx
      .select()
      .from(orderItemsTable)
      .where(and(eq(orderItemsTable.id, id.data), eq(orderItemsTable.sellerId, req.auth!.userId)))
      .for("update");
    if (!line) return { status: 404 as const, error: "Order line not found." };
    if (!LINE_TRANSITIONS[line.status]?.includes(body.data.status))
      return {
        status: 409 as const,
        error: `A ${line.status} order cannot be marked ${body.data.status}. Refresh and try again.`,
      };
    const [updated] = await tx
      .update(orderItemsTable)
      .set({
        status: body.data.status,
        ...(body.data.trackingNumber ? { trackingNumber: body.data.trackingNumber } : {}),
      })
      .where(eq(orderItemsTable.id, line.id))
      .returning();
    // Cancelled marketplace units go back on sale.
    if (body.data.status === "cancelled")
      await tx
        .update(productsTable)
        .set({ stockCount: sql`${productsTable.stockCount} + ${line.quantity}` })
        .where(and(eq(productsTable.id, line.productId), eq(productsTable.channel, "marketplace")));
    return { status: 200 as const, line: updated };
  });
  if (outcome.status !== 200) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }
  res.json({ id: outcome.line.id, status: outcome.line.status, trackingNumber: outcome.line.trackingNumber });
});

// Offline payments are recorded by managers once the money has arrived.
router.post(
  "/operations/orders/:id/payment",
  requireAuth,
  requireRole("manager"),
  async (req: AuthenticatedRequest, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    const body = z.object({ status: z.literal("paid") }).strict().safeParse(req.body);
    if (!id.success || !body.success) {
      res.status(400).json({ error: "Only an unpaid order can be marked paid." });
      return;
    }
    const [updated] = await db
      .update(ordersTable)
      .set({ paymentStatus: "paid", paidAt: new Date(), paidBy: req.auth!.userId })
      .where(and(eq(ordersTable.id, id.data), eq(ordersTable.paymentStatus, "unpaid")))
      .returning();
    if (!updated) {
      res.status(409).json({ error: "This order is already paid or does not exist. Refresh and try again." });
      return;
    }
    res.json({ id: updated.id, paymentStatus: updated.paymentStatus, paidAt: updated.paidAt });
  },
);

export default router;
