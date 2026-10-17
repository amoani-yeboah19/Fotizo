import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, avg, count, desc, eq } from "drizzle-orm";
import {
  db,
  bookingsTable,
  orderItemsTable,
  ordersTable,
  productsTable,
  reviewsTable,
  servicesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { productIdSchema } from "../lib/product-ids";

// Customer reviews. Only verified customers can review: a delivered order of
// the product, or a completed booking of the service. One review per person
// per listing, which they can change or remove.
const router: IRouter = Router();

type Kind = "product" | "service";
const kindSchema = z.enum(["product", "service"]);
const column = (kind: Kind) => (kind === "product" ? reviewsTable.productId : reviewsTable.serviceId);
const REVIEWS_SHOWN = 50;
/** The listing's UUID; products also accept Fotizo Shop catalogue ids ("1688-…"). */
const listingIdFor = (kind: Kind, raw: unknown) => {
  const parsed = (kind === "product" ? productIdSchema : z.string().uuid()).safeParse(raw);
  return parsed.success ? parsed.data : null;
};

/** "Ama Kumi" -> "Ama K." — reviews show who wrote them without a full name. */
const displayName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first || "Fotizo customer";
};

const toPublicReview = (r: typeof reviewsTable.$inferSelect, author: string) => ({
  id: r.id,
  rating: r.rating,
  comment: r.comment,
  author: displayName(author),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Whether this person may review the listing: delivered order or completed booking. */
async function eligible(tx: Tx | typeof db, kind: Kind, listingId: string, userId: string) {
  const [row] =
    kind === "product"
      ? await tx
          .select({ id: orderItemsTable.id })
          .from(orderItemsTable)
          .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
          .where(
            and(
              eq(orderItemsTable.productId, listingId),
              eq(ordersTable.buyerId, userId),
              eq(orderItemsTable.status, "delivered"),
            ),
          )
          .limit(1)
      : await tx
          .select({ id: bookingsTable.id })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.serviceId, listingId),
              eq(bookingsTable.buyerId, userId),
              eq(bookingsTable.status, "completed"),
            ),
          )
          .limit(1);
  return Boolean(row);
}

/**
 * Sets the listing's rating and count from its reviews. A listing with no
 * Fotizo reviews keeps the rating it had (imported goods carry the supplier's).
 */
async function refreshRating(tx: Tx, kind: Kind, listingId: string) {
  const [stats] = await tx
    .select({ total: count(), average: avg(reviewsTable.rating) })
    .from(reviewsTable)
    .where(eq(column(kind), listingId));
  const table = kind === "product" ? productsTable : servicesTable;
  await tx
    .update(table)
    .set(
      stats.total
        ? { reviewCount: stats.total, rating: Math.round(Number(stats.average) * 10) / 10 }
        : { reviewCount: 0 },
    )
    .where(eq(table.id, listingId));
}

// Public: a listing's reviews, newest first, with the rating breakdown.
for (const kind of ["product", "service"] as const) {
  router.get(`/${kind}s/:id/reviews`, async (req, res) => {
    const id = listingIdFor(kind, req.params.id);
    if (!id) {
      res.json({ items: [], total: 0, average: null, breakdown: [0, 0, 0, 0, 0] });
      return;
    }
    const where = eq(column(kind), id);
    const [rows, breakdown] = await Promise.all([
      db
        .select({ review: reviewsTable, author: usersTable.name })
        .from(reviewsTable)
        .innerJoin(usersTable, eq(usersTable.id, reviewsTable.authorId))
        .where(where)
        .orderBy(desc(reviewsTable.createdAt))
        .limit(REVIEWS_SHOWN),
      db
        .select({ rating: reviewsTable.rating, n: count() })
        .from(reviewsTable)
        .where(where)
        .groupBy(reviewsTable.rating),
    ]);
    const counts = [1, 2, 3, 4, 5].map((stars) => breakdown.find((b) => b.rating === stars)?.n ?? 0);
    const total = counts.reduce((a, b) => a + b, 0);
    const sum = counts.reduce((a, n, i) => a + n * (i + 1), 0);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      items: rows.map((r) => toPublicReview(r.review, r.author)),
      total,
      average: total ? Math.round((sum / total) * 10) / 10 : null,
      /** Number of 1- to 5-star reviews. */
      breakdown: counts,
    });
  });
}

// The signed-in person's standing on a listing: can they review, and their review if any.
router.get("/reviews/mine", requireAuth, async (req: AuthenticatedRequest, res) => {
  const kind = kindSchema.safeParse(req.query.kind);
  const id = kind.success ? listingIdFor(kind.data, req.query.id) : null;
  if (!kind.success || !id) {
    res.json({ canReview: false, review: null });
    return;
  }
  const mineKind = kind.data;
  const [mine] = await db
    .select({ review: reviewsTable, author: usersTable.name })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.authorId))
    .where(and(eq(column(mineKind), id), eq(reviewsTable.authorId, req.auth!.userId)));
  res.setHeader("Cache-Control", "no-store");
  res.json({
    canReview: Boolean(mine) || (await eligible(db, mineKind, id, req.auth!.userId)),
    review: mine ? toPublicReview(mine.review, mine.author) : null,
  });
});

const reviewSchema = z
  .object({
    kind: kindSchema,
    listingId: z.string().min(1).max(100),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).default(""),
  })
  .strict();

// Writes (or replaces) the signed-in person's review of a listing.
router.put("/reviews", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose 1 to 5 stars; comments are up to 2,000 characters." });
    return;
  }
  const { kind, rating, comment } = parsed.data;
  const listingId = listingIdFor(kind, parsed.data.listingId);
  if (!listingId) {
    res.status(404).json({ error: "Listing not found." });
    return;
  }
  const userId = req.auth!.userId;
  const outcome = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(reviewsTable)
      .where(and(eq(column(kind), listingId), eq(reviewsTable.authorId, userId)))
      .for("update");
    if (!existing && !(await eligible(tx, kind, listingId, userId)))
      return {
        status: 403 as const,
        error:
          kind === "product"
            ? "You can review a product once your order of it has been delivered."
            : "You can review a service once your booking of it is completed.",
      };
    const [saved] = existing
      ? await tx
          .update(reviewsTable)
          .set({ rating, comment, updatedAt: new Date() })
          .where(eq(reviewsTable.id, existing.id))
          .returning()
      : await tx
          .insert(reviewsTable)
          .values({ authorId: userId, rating, comment, ...(kind === "product" ? { productId: listingId } : { serviceId: listingId }) })
          .returning();
    await refreshRating(tx, kind, listingId);
    return { status: existing ? (200 as const) : (201 as const), saved };
  });
  if (outcome.status === 403) {
    res.status(403).json({ error: outcome.error });
    return;
  }
  const [author] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  res.status(outcome.status).json(toPublicReview(outcome.saved, author?.name ?? ""));
});

router.delete("/reviews/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const removed = id.success
    ? await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(reviewsTable)
          .where(and(eq(reviewsTable.id, id.data), eq(reviewsTable.authorId, req.auth!.userId)))
          .returning();
        if (row)
          await refreshRating(
            tx,
            row.productId ? "product" : "service",
            (row.productId ?? row.serviceId)!,
          );
        return row;
      })
    : undefined;
  if (!removed) {
    res.status(404).json({ error: "Review not found." });
    return;
  }
  res.status(204).end();
});

export default router;
