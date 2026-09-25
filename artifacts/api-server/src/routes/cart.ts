import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, cartItemsTable, productsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

// A signed-in customer's saved cart. Titles, images and prices come from the
// live product rows; checkout prices the order again on the server.
const router: IRouter = Router();
router.use("/cart", requireAuth);

const MAX_LINES = 100;
const MAX_QUANTITY = 99;

async function readCart(userId: string) {
  const rows = await db
    .select({
      productId: cartItemsTable.productId,
      quantity: cartItemsTable.quantity,
      title: productsTable.title,
      price: productsTable.price,
      images: productsTable.images,
      channel: productsTable.channel,
      seller: usersTable.name,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(productsTable.id, cartItemsTable.productId))
    .innerJoin(usersTable, eq(usersTable.id, productsTable.sellerId))
    // Unpublished listings drop out of the cart until they return.
    .where(and(eq(cartItemsTable.userId, userId), eq(productsTable.status, "active")))
    .orderBy(asc(cartItemsTable.addedAt), asc(cartItemsTable.productId));
  return rows.map((r) => ({
    id: r.productId,
    productId: r.productId,
    title: r.title,
    price: r.price,
    image: r.images[0] ?? "",
    seller: r.channel === "shop" ? "Fotizo Shop" : r.seller,
    quantity: r.quantity,
  }));
}

router.get("/cart", async (req: AuthenticatedRequest, res) => {
  res.json(await readCart(req.auth!.userId));
});

const productId = z.string().uuid();
const quantitySchema = z.object({ quantity: z.number().int().min(1).max(MAX_QUANTITY) }).strict();

async function isActive(id: string) {
  const [row] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.status, "active")));
  return Boolean(row);
}

async function lineCount(userId: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cartItemsTable)
    .where(eq(cartItemsTable.userId, userId));
  return n;
}

// Sets one line's quantity (adding the line if needed). Setting rather than
// incrementing keeps retried requests harmless.
router.put("/cart/items/:productId", async (req: AuthenticatedRequest, res) => {
  const id = productId.safeParse(req.params.productId);
  const body = quantitySchema.safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: `Choose a quantity from 1 to ${MAX_QUANTITY}.` });
    return;
  }
  if (!(await isActive(id.data))) {
    res.status(404).json({ error: "This product is no longer available." });
    return;
  }
  const userId = req.auth!.userId;
  const [existing] = await db
    .select({ productId: cartItemsTable.productId })
    .from(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, id.data)));
  if (!existing && (await lineCount(userId)) >= MAX_LINES) {
    res.status(409).json({ error: `Your cart can hold up to ${MAX_LINES} different products.` });
    return;
  }
  await db
    .insert(cartItemsTable)
    .values({ userId, productId: id.data, quantity: body.data.quantity })
    .onConflictDoUpdate({
      target: [cartItemsTable.userId, cartItemsTable.productId],
      set: { quantity: body.data.quantity },
    });
  res.status(204).end();
});

router.delete("/cart/items/:productId", async (req: AuthenticatedRequest, res) => {
  const id = productId.safeParse(req.params.productId);
  if (id.success)
    await db
      .delete(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, req.auth!.userId), eq(cartItemsTable.productId, id.data)));
  res.status(204).end();
});

router.delete("/cart", async (req: AuthenticatedRequest, res) => {
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.auth!.userId));
  res.status(204).end();
});

// Folds a signed-out browser cart into the account on sign-in: quantities add
// up (capped), unknown or unpublished products are skipped.
const mergeSchema = z
  .object({
    items: z
      .array(
        z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY) }).strict(),
      )
      .max(MAX_LINES),
  })
  .strict();

router.post("/cart/merge", async (req: AuthenticatedRequest, res) => {
  const body = mergeSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "The saved cart could not be read." });
    return;
  }
  const userId = req.auth!.userId;
  const ids = [...new Set(body.data.items.map((i) => i.productId))];
  const active = ids.length
    ? await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(and(inArray(productsTable.id, ids), eq(productsTable.status, "active")))
    : [];
  const allowed = new Set(active.map((p) => p.id));
  await db.transaction(async (tx) => {
    for (const item of body.data.items) {
      if (!allowed.has(item.productId)) continue;
      await tx
        .insert(cartItemsTable)
        .values({ userId, productId: item.productId, quantity: item.quantity })
        .onConflictDoUpdate({
          target: [cartItemsTable.userId, cartItemsTable.productId],
          set: { quantity: sql`least(${cartItemsTable.quantity} + ${item.quantity}, ${MAX_QUANTITY})` },
        });
    }
  });
  res.json(await readCart(userId));
});

export default router;
