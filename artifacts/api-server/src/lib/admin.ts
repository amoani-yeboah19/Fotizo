import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  adminAuditTable,
  listingReviewsTable,
  listingReviewEventsTable,
  usersTable,
  type AdminTargetType,
  type ListingKind,
  type ListingSnapshot,
  type ProductRow,
  type ServiceRow,
} from "@workspace/db";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class AdminError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The acting manager, re-read and locked inside the transaction so a manager
 * demoted or suspended a moment ago cannot complete a decision.
 */
export async function lockActingManager(tx: Tx, actorId: string) {
  const [actor] = await tx.select().from(usersTable).where(eq(usersTable.id, actorId)).for("update");
  if (!actor || actor.suspendedAt || actor.role !== "manager")
    throw new AdminError(403, "Manager access is required.");
  return actor;
}

/** Appends to the administrative audit trail; fails the transaction if it can't. */
export async function recordAudit(
  tx: Tx,
  entry: {
    actor: { id: string; name: string };
    action: string;
    targetType: AdminTargetType;
    targetId: string;
    targetLabel: string;
    reason: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  },
) {
  await tx.insert(adminAuditTable).values({
    actorId: entry.actor.id,
    actorName: entry.actor.name,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel,
    reason: entry.reason,
    before: entry.before,
    after: entry.after,
  });
}

export const toAuditEntry = (row: typeof adminAuditTable.$inferSelect) => ({
  id: row.id,
  actor: row.actorName,
  action: row.action,
  targetId: row.targetId,
  targetLabel: row.targetLabel,
  reason: row.reason,
  before: row.before,
  after: row.after,
  createdAt: row.createdAt.toISOString(),
});

// ── Listing reviews ──────────────────────────────────────────────────────────
// Listings from seller accounts are reviewed after they go live. Fotizo's own
// shop inventory (china_representative) is not queued for review.

export const REVIEWED_ROLES = new Set(["seller"]);
// Product photos can be large data URLs; the review keeps the cover shots.
const SNAPSHOT_IMAGES = 4;

export const productSnapshot = (p: ProductRow): ListingSnapshot => ({
  title: p.title,
  description: p.description,
  category: p.category,
  price: p.price,
  currency: "GBP",
  images: p.images.slice(0, SNAPSHOT_IMAGES),
});

export const serviceSnapshot = (s: ServiceRow): ListingSnapshot => ({
  title: s.title,
  description: s.description,
  category: s.category,
  price: s.hourlyRate,
  currency: "GBP",
  images: s.avatar ? [s.avatar] : [],
});

export const sameSnapshot = (a: ListingSnapshot, b: ListingSnapshot) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Queues a new listing, or a changed one, for review. A change always starts a
 * new pending version; earlier versions and decisions stay in the history.
 */
export async function submitForReview(
  tx: Tx,
  input: { kind: ListingKind; listingId: string; seller: { id: string; name: string }; snapshot: ListingSnapshot; note?: string },
) {
  const [existing] = await tx
    .select()
    .from(listingReviewsTable)
    .where(and(eq(listingReviewsTable.kind, input.kind), eq(listingReviewsTable.listingId, input.listingId)))
    .for("update");
  const now = new Date();
  if (!existing) {
    const [review] = await tx
      .insert(listingReviewsTable)
      .values({
        kind: input.kind,
        listingId: input.listingId,
        sellerId: input.seller.id,
        snapshot: input.snapshot,
        submittedAt: now,
      })
      .returning();
    await tx.insert(listingReviewEventsTable).values({
      reviewId: review.id,
      action: "submitted",
      actorId: input.seller.id,
      actorName: input.seller.name,
      reason: input.note || `New ${input.kind} listing submitted for review.`,
      version: 1,
      snapshot: input.snapshot,
      createdAt: now,
    });
    return;
  }
  const version = existing.version + 1;
  await tx
    .update(listingReviewsTable)
    .set({ status: "pending", version, snapshot: input.snapshot, submittedAt: now, decidedAt: null })
    .where(eq(listingReviewsTable.id, existing.id));
  await tx.insert(listingReviewEventsTable).values({
    reviewId: existing.id,
    action: "resubmitted",
    actorId: input.seller.id,
    actorName: input.seller.name,
    reason: input.note || "Listing updated by the seller.",
    version,
    snapshot: input.snapshot,
    createdAt: now,
  });
}

/** Review state shown to a listing's owner, including why it was rejected. */
export async function moderationFor(kind: ListingKind, listingIds: string[]) {
  const result = new Map<string, { status: "pending" | "approved" | "rejected"; reason: string | null }>();
  if (!listingIds.length) return result;
  const reviews = await db
    .select({ id: listingReviewsTable.id, listingId: listingReviewsTable.listingId, status: listingReviewsTable.status })
    .from(listingReviewsTable)
    .where(and(eq(listingReviewsTable.kind, kind), inArray(listingReviewsTable.listingId, listingIds)));
  const rejected = reviews.filter((r) => r.status === "rejected").map((r) => r.id);
  const reasons = rejected.length
    ? await db
        .selectDistinctOn([listingReviewEventsTable.reviewId], {
          reviewId: listingReviewEventsTable.reviewId,
          reason: listingReviewEventsTable.reason,
        })
        .from(listingReviewEventsTable)
        .where(and(inArray(listingReviewEventsTable.reviewId, rejected), eq(listingReviewEventsTable.action, "rejected")))
        .orderBy(listingReviewEventsTable.reviewId, desc(listingReviewEventsTable.createdAt))
    : [];
  const reasonByReview = new Map(reasons.map((r) => [r.reviewId, r.reason]));
  for (const r of reviews)
    result.set(r.listingId, { status: r.status, reason: r.status === "rejected" ? (reasonByReview.get(r.id) ?? null) : null });
  return result;
}

export const HOLD_MESSAGE =
  "Fotizo has taken this listing down for review. Update it to resubmit, or contact support.";

/** Unique-constraint violations, whether or not the driver error is wrapped. */
export const isUniqueViolation = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
};

export const escapeLike = (value: string) => `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export const monthStart = sql`date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'`;
