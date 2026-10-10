import { Router, type IRouter } from "express";
import { listingImagesProblem } from "../lib/storage";
import { productIdSchema } from "../lib/product-ids";
import {
  HOLD_MESSAGE,
  REVIEWED_ROLES,
  moderationFor,
  productSnapshot,
  sameSnapshot,
  submitForReview,
} from "../lib/admin";
import { z } from "zod";
import type { CatalogueProduct } from "@workspace/api-zod";
import { eq, and, ne, desc, sql, isNull } from "drizzle-orm";
import { ownerVisible } from "../lib/identity";
import {
  db,
  productsTable,
  usersTable,
  orderItemsTable,
  type ProductRow,
} from "@workspace/db";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middlewares/requireAuth";

import {
  catalogueQuery,
  catalogueChannel,
  catalogueWhere,
  catalogueOrder,
  categoryKey,
} from "../lib/catalogue";

const router: IRouter = Router();

// Roles allowed to own a listing. Sellers are the marketplace side;
// china_representative is Fotizo's own sourcing account, which the imported
// shop catalogue is listed under. Everything else (buyer, manager, developer,
// the USA representative) is read-only here.
const PRODUCT_OWNER_ROLES = new Set(["seller", "china_representative"]);

const money = z
  .number()
  .positive()
  .max(99_999_999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Use no more than two decimal places.",
  );
const newProductSchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(20).max(5000),
  price: money,
  originalPrice: money.nullable(),
  stockCount: z.number().int().min(0).max(2_147_483_647),
  images: z.array(z.string().min(1).max(1_000_000)).max(8).default([]),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  specs: z.record(z.string(), z.string()).default({}),
});

// Same fields, all optional — a PATCH only needs to send what's changing.
const updateProductSchema = newProductSchema.partial().extend({
  status: z.enum(["active", "unpublished"]).optional(),
});

// Shape returned to the client — seller name is looked up via the FK at read
// time rather than stored on the row, so a renamed seller never goes stale.
export function toPublicProduct(
  row: ProductRow,
  sellerName: string,
): CatalogueProduct {
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
    channel: row.channel,
    status: row.status,
    image: row.images[0] ?? "",
    images: row.images,
    // Fotizo Shop goods are sourced to order, so they never run out.
    inStock: row.channel === "shop" || row.stockCount > 0,
    stockCount: row.stockCount,
    tags: row.tags,
    // Supplier links stay private (staff see them in the confirmation queue).
    specs: publicSpecs(row.specs),
    ...(row.sourcePlatform && row.sourceProductId
      ? {
          // Supplier prices, variants, minimums and delivery are confirmed
          // before purchase, so the listed price stays an estimate.
          sourcing: {
            platform: row.sourcePlatform as "alibaba" | "1688" | "taobao" | "pinduoduo" | "tuwa",
            productId: row.sourceProductId,
            sourceUrl: null,
            currency: row.supplierCurrency,
            priceRange: row.specs.priceRange ?? null,
            minimumOrder: row.specs.minimumOrder ?? null,
            unit: row.specs.unit ?? null,
            capturedAt: row.specs.capturedAt ?? null,
            priceStatus: "estimate" as const,
          },
        }
      : {}),
  };
}

function publicSpecs(specs: Record<string, string>) {
  const { supplierListing: _supplierListing, ...rest } = specs;
  return rest;
}

router.get("/products", async (req, res) => {
  const filter = catalogueQuery.safeParse(req.query);
  if (!filter.success) {
    res.status(400).json({ error: "Invalid catalogue filters." });
    return;
  }
  const { page, pageSize } = filter.data;
  const where = catalogueWhere(filter.data);
  // A shared snapshot keeps the page and its total consistent during writes.
  const result = await db.transaction(
    async (tx) => {
      const [count] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(productsTable)
        .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
        .where(where);
      const rows = await tx
        .select({ product: productsTable, sellerName: usersTable.name })
        .from(productsTable)
        .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
        .where(where)
        .orderBy(...catalogueOrder(filter.data.sort))
        .limit(pageSize)
        .offset(page * pageSize);
      return {
        items: rows.map((r) =>
          toPublicProduct(r.product, r.sellerName ?? "Unknown seller"),
        ),
        total: count.total,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < count.total,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  res.json(result);
});

router.get("/products/categories", async (req, res) => {
  const filter = z
    .object({ channel: catalogueChannel })
    .strict()
    .safeParse(req.query);
  if (!filter.success) {
    res.status(400).json({ error: "Invalid catalogue channel." });
    return;
  }
  // Aggregate all published listings, never just those visible on the current page.
  const rows = await db
    .select({
      category: categoryKey,
      count: sql<number>`count(*)::int`,
      image: sql<string>`coalesce(min(nullif(${productsTable.images}[1], '')), '')`,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.status, "active"),
        isNull(productsTable.deletedAt),
        eq(productsTable.channel, filter.data.channel),
        ownerVisible(productsTable.sellerId),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  res.json(rows);
});

// Supplier offer ids published in the shop for one platform. The storefront
// previews sourced batches from local files until they are imported; this lets
// it show the published (orderable) product instead, once, with the right totals.
router.get("/products/published-sources", async (req, res) => {
  const platform = z.enum(["1688", "taobao", "pinduoduo", "tuwa"]).safeParse(req.query.platform);
  if (!platform.success) {
    res.status(400).json({ error: "Choose a supplier platform." });
    return;
  }
  const rows = await db
    .select({ id: productsTable.sourceProductId })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.channel, "shop"),
        eq(productsTable.status, "active"),
        eq(productsTable.sourcePlatform, platform.data),
        ownerVisible(productsTable.sellerId),
      ),
    );
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({ platform: platform.data, ids: rows.flatMap((r) => (r.id ? [r.id] : [])) });
});

router.get("/products/:id", async (req, res) => {
  const parsedId = productIdSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const [row] = await db
    .select({ product: productsTable, sellerName: usersTable.name })
    .from(productsTable)
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(
      and(
        eq(productsTable.id, parsedId.data),
        eq(productsTable.status, "active"),
        isNull(productsTable.deletedAt),
        ownerVisible(productsTable.sellerId),
      ),
    )
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json(toPublicProduct(row.product, row.sellerName ?? "Unknown seller"));
});

router.get("/products/:id/related", async (req, res) => {
  const parsedId = productIdSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    res.json([]);
    return;
  }
  const product = await db.query.productsTable.findFirst({
    where: and(
      eq(productsTable.id, parsedId.data),
      eq(productsTable.status, "active"),
      isNull(productsTable.deletedAt),
      ownerVisible(productsTable.sellerId),
    ),
  });
  if (!product) {
    res.json([]);
    return;
  }
  const rows = await db
    .select({ product: productsTable, sellerName: usersTable.name })
    .from(productsTable)
    .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
    .where(
      and(
        eq(
          categoryKey,
          sql`(select ${categoryKey} from products where id = ${product.id})`,
        ),
        eq(productsTable.channel, product.channel),
        ne(productsTable.id, product.id),
        eq(productsTable.status, "active"),
        isNull(productsTable.deletedAt),
        ownerVisible(productsTable.sellerId),
      ),
    )
    .orderBy(desc(productsTable.createdAt), desc(productsTable.id))
    .limit(6);
  res.json(
    rows.map((r) =>
      toPublicProduct(r.product, r.sellerName ?? "Unknown seller"),
    ),
  );
});

// Role is enforced server-side, same as auth's signup restriction — a client
// can't just claim to be a seller by editing the request body.
router.post(
  "/products",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    if (!PRODUCT_OWNER_ROLES.has(req.auth!.role)) {
      res
        .status(403)
        .json({ error: "This account type cannot list products." });
      return;
    }

    const parsed = newProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid product data.", issues: parsed.error.issues });
      return;
    }

    const imageProblem = await listingImagesProblem(req.auth!.userId, "product", parsed.data.images);
    if (imageProblem) {
      res.status(400).json({ error: imageProblem });
      return;
    }

    const seller = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.auth!.userId),
    });
    // Seller listings go live and join the review queue in one transaction.
    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(productsTable)
        .values({
          ...parsed.data,
          sellerId: req.auth!.userId,
          channel:
            req.auth!.role === "china_representative" ? "shop" : "marketplace",
        })
        .returning();
      if (seller && REVIEWED_ROLES.has(req.auth!.role))
        await submitForReview(tx, {
          kind: "product",
          listingId: row.id,
          seller,
          snapshot: productSnapshot(row),
        });
      return row;
    });
    res
      .status(201)
      .json(toPublicProduct(created, seller?.name ?? "Unknown seller"));
  },
);

router.get(
  "/seller/products",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const rows = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.sellerId, req.auth!.userId), isNull(productsTable.deletedAt)))
      .orderBy(desc(productsTable.createdAt));
    // Units sold per listing from this seller's order lines, excluding cancelled.
    const sold = await db
      .select({
        productId: orderItemsTable.productId,
        units: sql<number>`coalesce(sum(${orderItemsTable.quantity}), 0)::int`,
      })
      .from(orderItemsTable)
      .where(
        and(
          eq(orderItemsTable.sellerId, req.auth!.userId),
          ne(orderItemsTable.status, "cancelled"),
        ),
      )
      .groupBy(orderItemsTable.productId);
    const unitsSold = new Map(sold.map((s) => [s.productId, s.units]));
    const reviews = await moderationFor(
      "product",
      rows.map((r) => r.id),
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        price: row.price,
        // Fotizo Shop goods are sourced to order: there is no stock to count
        // or run out of, so no quantity is reported for them.
        stock: row.channel === "shop" ? null : row.stockCount,
        sourcedToOrder: row.channel === "shop",
        sales: unitsSold.get(row.id) ?? 0,
        rating: row.rating,
        reviewCount: row.reviewCount,
        status:
          row.status === "unpublished"
            ? "unpublished"
            : row.channel === "shop" || row.stockCount > 0
              ? "active"
              : "out_of_stock",
        image: row.images[0] ?? "",
        category: row.category,
        // Review outcome and any staff hold, so the seller sees why a listing is down.
        moderation: {
          review: reviews.get(row.id)?.status ?? null,
          reason: reviews.get(row.id)?.reason ?? null,
          held: row.moderationHold,
        },
      })),
    );
  },
);

// Editing and removing are both scoped to "this row belongs to me" — a
// seller can only touch their own listings, checked against the session,
// never a client-supplied id.
async function loadOwnedProduct(id: string | string[], sellerId: string) {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { error: 404 as const };
  const product = await db.query.productsTable.findFirst({
    where: eq(productsTable.id, parsedId.data),
  });
  if (!product || product.deletedAt) return { error: 404 as const };
  if (product.sellerId !== sellerId) return { error: 403 as const };
  return { product };
}

router.get(
  "/seller/products/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const found = await loadOwnedProduct(req.params.id, req.auth!.userId);
    if (found.error) {
      res
        .status(found.error)
        .json({ error: "Listing is not available to this account." });
      return;
    }
    const seller = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.auth!.userId),
    });
    res.json(toPublicProduct(found.product, seller?.name ?? "Unknown seller"));
  },
);

router.patch(
  "/products/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    if (!PRODUCT_OWNER_ROLES.has(req.auth!.role)) {
      res.status(403).json({ error: "This account cannot manage listings." });
      return;
    }
    const found = await loadOwnedProduct(req.params.id, req.auth!.userId);
    if (found.error === 404) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    if (found.error === 403) {
      res.status(403).json({ error: "You can only edit your own products." });
      return;
    }

    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid product data.", issues: parsed.error.issues });
      return;
    }

    if (!Object.keys(parsed.data).length) {
      res.status(400).json({ error: "No listing changes provided." });
      return;
    }

    if (parsed.data.status === "active" && found.product.moderationHold) {
      res.status(409).json({ error: HOLD_MESSAGE });
      return;
    }
    if (parsed.data.images) {
      const imageProblem = await listingImagesProblem(
        req.auth!.userId,
        "product",
        parsed.data.images,
        found.product.images,
      );
      if (imageProblem) {
        res.status(400).json({ error: imageProblem });
        return;
      }
    }

    const seller = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.auth!.userId),
    });
    // A content change starts a new review version; stock and publication don't.
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(productsTable)
        .set(parsed.data)
        .where(eq(productsTable.id, found.product.id))
        .returning();
      if (
        seller &&
        REVIEWED_ROLES.has(req.auth!.role) &&
        !sameSnapshot(productSnapshot(found.product), productSnapshot(row))
      )
        await submitForReview(tx, {
          kind: "product",
          listingId: row.id,
          seller,
          snapshot: productSnapshot(row),
        });
      return row;
    });
    res.json(toPublicProduct(updated, seller?.name ?? "Unknown seller"));
  },
);

// Owner deletion is distinct from moderation unpublishing. Keep the row for
// order history, but remove it from both public and owner catalogue reads.
router.delete(
  "/products/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    if (!PRODUCT_OWNER_ROLES.has(req.auth!.role)) {
      res.status(403).json({ error: "This account cannot manage listings." });
      return;
    }
    const found = await loadOwnedProduct(req.params.id, req.auth!.userId);
    if (found.error === 404) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    if (found.error === 403) {
      res.status(403).json({ error: "You can only remove your own products." });
      return;
    }

    await db
      .update(productsTable)
      .set({ status: "unpublished", deletedAt: new Date() })
      .where(eq(productsTable.id, found.product.id));
    res.status(204).end();
  },
);

export default router;
