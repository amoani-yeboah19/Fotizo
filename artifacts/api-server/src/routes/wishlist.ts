import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, productsTable, usersTable, wishlistItemsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { toPublicProduct } from "./products";

const router: IRouter = Router();
router.use("/wishlist", requireAuth);

// Bounds a single account's saved list and each response.
const MAX_ITEMS = 500;

// Saved products that are still published, newest first. Unpublished items stay
// saved and reappear if the listing is republished.
router.get("/wishlist", async (req: AuthenticatedRequest, res) => {
  const rows = await db
    .select({ product: productsTable, sellerName: usersTable.name })
    .from(wishlistItemsTable)
    .innerJoin(productsTable, eq(productsTable.id, wishlistItemsTable.productId))
    .leftJoin(usersTable, eq(usersTable.id, productsTable.sellerId))
    .where(
      and(
        eq(wishlistItemsTable.userId, req.auth!.userId),
        eq(productsTable.status, "active"),
      ),
    )
    .orderBy(desc(wishlistItemsTable.createdAt), desc(wishlistItemsTable.productId))
    .limit(MAX_ITEMS);
  res.json(rows.map((r) => toPublicProduct(r.product, r.sellerName ?? "Unknown seller")));
});

const productId = z.string().uuid();

router.put("/wishlist/:productId", async (req: AuthenticatedRequest, res) => {
  const id = productId.safeParse(req.params.productId);
  const [product] = id.success
    ? await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(and(eq(productsTable.id, id.data), eq(productsTable.status, "active")))
    : [];
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wishlistItemsTable)
    .where(eq(wishlistItemsTable.userId, req.auth!.userId));
  if (count >= MAX_ITEMS) {
    res.status(409).json({ error: `Your wishlist can hold up to ${MAX_ITEMS} products.` });
    return;
  }
  // Saving an already-saved product is a no-op, so retries are safe.
  await db
    .insert(wishlistItemsTable)
    .values({ userId: req.auth!.userId, productId: product.id })
    .onConflictDoNothing();
  res.status(204).end();
});

router.delete("/wishlist/:productId", async (req: AuthenticatedRequest, res) => {
  const id = productId.safeParse(req.params.productId);
  if (id.success)
    await db
      .delete(wishlistItemsTable)
      .where(
        and(
          eq(wishlistItemsTable.userId, req.auth!.userId),
          eq(wishlistItemsTable.productId, id.data),
        ),
      );
  res.status(204).end();
});

export default router;
