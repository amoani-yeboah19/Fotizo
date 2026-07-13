import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, usersTable, type OrderItemRow } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Only productId/quantity are trusted from the client. Price and total are
// deliberately NOT accepted here — the client's cart price can be stale or
// tampered with, so every line is re-priced from the product's current price
// inside the transaction below, and the total is computed from that, never
// from what the client claims it paid.
const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .min(1)
    .max(100),
});

// Distinguishes an expected business-rule failure (bad request / conflict)
// from a genuine server error, so the catch block can pick the right status.
class OrderPlacementError extends Error {}

function toPublicOrder(item: OrderItemRow, createdAt: Date) {
  return {
    id: item.id,
    productId: item.productId,
    productTitle: item.productTitle,
    productImage: item.productImage,
    seller: item.seller,
    price: item.price,
    quantity: item.quantity,
    status: item.status,
    date: createdAt.toISOString().split("T")[0],
    trackingNumber: item.trackingNumber,
  };
}

// Purchases — items the caller bought. Anyone can buy on Fotizo (a seller
// shopping from other sellers is a buyer here), so this is scoped by buyerId
// and no longer branches on role. Sales are a separate endpoint below.
router.get("/orders", requireAuth, async (req: AuthenticatedRequest, res) => {
  const rows = await db
    .select({ item: orderItemsTable, createdAt: ordersTable.createdAt })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.buyerId, req.auth!.userId))
    .orderBy(desc(ordersTable.createdAt));
  res.json(rows.map((r) => toPublicOrder(r.item, r.createdAt)));
});

// Sales — items bought FROM the caller (their fulfilment queue). Scoped by the
// per-line sellerId, so it's correct even for a mixed-seller order.
router.get("/sales", requireAuth, async (req: AuthenticatedRequest, res) => {
  const rows = await db
    .select({ item: orderItemsTable, createdAt: ordersTable.createdAt })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(orderItemsTable.sellerId, req.auth!.userId))
    .orderBy(desc(ordersTable.createdAt));
  res.json(rows.map((r) => toPublicOrder(r.item, r.createdAt)));
});

router.post("/orders", requireAuth, async (req: AuthenticatedRequest, res) => {
  // Buyers and sellers can both purchase; staff accounts (manager/developer) can't.
  if (req.auth!.role !== "buyer" && req.auth!.role !== "seller") {
    res.status(403).json({ error: "This account type can't place orders." });
    return;
  }

  const parsed = placeOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order request.", issues: parsed.error.issues });
    return;
  }

  try {
    const orderId = await db.transaction(async (tx) => {
      const lines: {
        productId: string;
        productTitle: string;
        productImage: string;
        sellerId: string;
        seller: string;
        price: number;
        quantity: number;
      }[] = [];

      const sellerNameCache = new Map<string, string>();

      for (const { productId, quantity } of parsed.data.items) {
        // Atomic, race-safe: the row only updates if it's still active AND
        // has enough stock, in the same statement that checks it — two
        // concurrent checkouts against the last unit can't both succeed.
        const [product] = await tx
          .update(productsTable)
          .set({ stockCount: sql`${productsTable.stockCount} - ${quantity}` })
          .where(
            and(
              eq(productsTable.id, productId),
              eq(productsTable.status, "active"),
              gte(productsTable.stockCount, quantity),
            ),
          )
          .returning();

        if (!product) {
          throw new OrderPlacementError(
            `One of the items in your order is no longer available in the requested quantity.`,
          );
        }

        let sellerName = sellerNameCache.get(product.sellerId);
        if (!sellerName) {
          const seller = await tx.query.usersTable.findFirst({ where: eq(usersTable.id, product.sellerId) });
          sellerName = seller?.name ?? "Unknown seller";
          sellerNameCache.set(product.sellerId, sellerName);
        }

        lines.push({
          productId: product.id,
          productTitle: product.title,
          productImage: product.images[0] ?? "",
          sellerId: product.sellerId,
          seller: sellerName,
          price: product.price,
          quantity,
        });
      }

      const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

      const [order] = await tx
        .insert(ordersTable)
        .values({ buyerId: req.auth!.userId, total })
        .returning();

      await tx.insert(orderItemsTable).values(lines.map((l) => ({ ...l, orderId: order.id })));

      return order.id;
    });

    res.status(201).json({ orderId });
  } catch (err) {
    if (err instanceof OrderPlacementError) {
      res.status(409).json({ error: err.message });
      return;
    }
    req.log?.error({ err }, "Order placement failed");
    res.status(500).json({ error: "Could not place order. Please try again." });
  }
});

export default router;
