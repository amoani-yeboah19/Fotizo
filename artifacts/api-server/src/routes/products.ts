import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, ne, desc } from "drizzle-orm";
import { db, productsTable, usersTable, type ProductRow } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

const newProductSchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(20).max(5000),
  price: z.number().positive(),
  originalPrice: z.number().positive().nullable(),
  stockCount: z.number().int().min(0),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  specs: z.record(z.string(), z.string()).default({}),
});

// Shape returned to the client — seller name is looked up via the FK at read
// time rather than stored on the row, so a renamed seller never goes stale.
function toPublicProduct(row: ProductRow, sellerName: string) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    originalPrice: row.originalPrice,
    rating: row.rating,
    reviewCount: row.reviewCount,
    seller: sellerName,
    sellerId: row.sellerId,
    category: row.category,
    image: row.images[0] ?? "",
    images: row.images,
    inStock: row.stockCount > 0,
    stockCount: row.stockCount,
    tags: row.tags,
    specs: row.specs,
  };
}

router.get("/products", async (_req, res) => {
  const rows = await db
    .select({ product: productsTable, sellerName: usersTable.name })
    .from(productsTable)
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .orderBy(desc(productsTable.createdAt));
  res.json(rows.map((r) => toPublicProduct(r.product, r.sellerName ?? "Unknown seller")));
});

router.get("/products/:id", async (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const [row] = await db
    .select({ product: productsTable, sellerName: usersTable.name })
    .from(productsTable)
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(eq(productsTable.id, parsedId.data))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json(toPublicProduct(row.product, row.sellerName ?? "Unknown seller"));
});

router.get("/products/:id/related", async (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) {
    res.json([]);
    return;
  }
  const product = await db.query.productsTable.findFirst({
    where: eq(productsTable.id, parsedId.data),
  });
  if (!product) {
    res.json([]);
    return;
  }
  const rows = await db
    .select({ product: productsTable, sellerName: usersTable.name })
    .from(productsTable)
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(and(eq(productsTable.category, product.category), ne(productsTable.id, product.id)))
    .limit(3);
  res.json(rows.map((r) => toPublicProduct(r.product, r.sellerName ?? "Unknown seller")));
});

// Role is enforced server-side, same as auth's signup restriction — a client
// can't just claim to be a seller by editing the request body.
router.post("/products", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.auth!.role !== "seller") {
    res.status(403).json({ error: "Only seller accounts can list products." });
    return;
  }

  const parsed = newProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product data.", issues: parsed.error.issues });
    return;
  }

  const [created] = await db
    .insert(productsTable)
    .values({ ...parsed.data, sellerId: req.auth!.userId })
    .returning();

  const seller = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.auth!.userId) });
  res.status(201).json(toPublicProduct(created, seller?.name ?? "Unknown seller"));
});

router.get("/seller/products", requireAuth, async (req: AuthenticatedRequest, res) => {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.sellerId, req.auth!.userId))
    .orderBy(desc(productsTable.createdAt));

  res.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      price: row.price,
      stock: row.stockCount,
      // No orders/sales tracking yet — filled in once the payments feature exists.
      sales: 0,
      status: row.stockCount > 0 ? "active" : "out_of_stock",
      image: row.images[0] ?? "",
      category: row.category,
    })),
  );
});

export default router;
