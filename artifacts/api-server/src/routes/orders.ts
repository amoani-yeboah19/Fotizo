import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, type OrderItemRow } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

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

// Purchasing stays closed until verified payments, delivery snapshots and
// idempotency are implemented. Do not consume stock for an unpaid order.
router.post("/orders", requireAuth, (_req, res) => {
  res.status(503).json({ error: "Online checkout is not available yet. Your cart has not been charged." });
});

export default router;
