import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  adminAuditTable,
  disputesTable,
  disputeEventsTable,
  disputeStatementsTable,
  listingReviewsTable,
  listingReviewEventsTable,
  ordersTable,
  productsTable,
  servicesTable,
  sessionsTable,
  usersTable,
  userRoleEnum,
  type DisputeStatus,
} from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import {
  AdminError,
  escapeLike,
  isUniqueViolation,
  lockActingManager,
  monthStart,
  recordAudit,
  toAuditEntry,
  type Tx,
} from "../lib/admin";
import { DISPUTE_ACTIONS, DISPUTE_ACTION_LABELS, DISPUTE_CATEGORY_LABELS, managedOrders } from "../lib/disputes";

// The manager workspace: overview, accounts, publication, listing approvals,
// order oversight, disputes and the audit trail. Every decision locks the
// acting manager, checks the expected previous value (409 when stale) and is
// saved in the same transaction as its audit record.
const router: IRouter = Router();
router.use(requireAuth);
router.use((req: AuthenticatedRequest, res, next) => {
  if (req.auth!.role !== "manager") {
    res.status(403).json({ error: "Manager access is required." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
});

const PAGE_SIZE = 20;
const page = z.coerce.number().int().min(1).max(10_000).default(1);
const search = z.string().trim().max(120).default("");
const reason = z
  .string()
  .trim()
  .min(5, "Enter a reason of 5–1000 characters.")
  .max(1000, "Enter a reason of 5–1000 characters.");
const id = z.string().uuid();
const offset = (p: number) => (p - 1) * PAGE_SIZE;
const pageOf = <T>(items: T[], total: number, p: number) => ({ items, total, page: p, pageSize: PAGE_SIZE });

function badRequest(res: Response, error: z.ZodError) {
  const issue = error.issues[0];
  res.status(400).json({ error: issue?.message.startsWith("Enter") ? issue.message : "Check the request and try again." });
}

/** Runs a decision transaction, turning AdminError into its HTTP response. */
async function decide(res: Response, work: (tx: Tx) => Promise<unknown>) {
  try {
    const result = await db.transaction(work);
    res.json(result ?? { ok: true });
  } catch (error) {
    if (!(error instanceof AdminError)) throw error;
    res.status(error.status).json({ error: error.message });
  }
}

const accountStatus = (u: { suspendedAt: Date | null }) => (u.suspendedAt ? "suspended" : "active");
const toAdminUser = (u: typeof usersTable.$inferSelect) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  verified: u.verified,
  status: accountStatus(u),
  createdAt: u.createdAt.toISOString(),
});

// ── Overview ────────────────────────────────────────────────────────────────
router.get("/overview", async (_req, res) => {
  const [users] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newThisMonth: sql<number>`(count(*) filter (where ${usersTable.createdAt} >= ${monthStart}))::int`,
      unverified: sql<number>`(count(*) filter (where not ${usersTable.verified}))::int`,
    })
    .from(usersTable);
  const [products] = await db
    .select({
      active: sql<number>`(count(*) filter (where ${productsTable.status} = 'active'))::int`,
      unpublished: sql<number>`(count(*) filter (where ${productsTable.status} = 'unpublished'))::int`,
    })
    .from(productsTable);
  const [services] = await db
    .select({
      active: sql<number>`(count(*) filter (where ${servicesTable.status} = 'active'))::int`,
      unpublished: sql<number>`(count(*) filter (where ${servicesTable.status} = 'unpublished'))::int`,
    })
    .from(servicesTable);
  const [orders] = await db
    .select({ thisMonth: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, monthStart));
  res.json({
    totalUsers: users.total,
    newUsersThisMonth: users.newThisMonth,
    unverifiedUsers: users.unverified,
    activeProducts: products.active,
    activeServices: services.active,
    ordersThisMonth: orders.thisMonth,
    unpublishedProducts: products.unpublished,
    unpublishedServices: services.unpublished,
  });
});

// ── Accounts ────────────────────────────────────────────────────────────────
const usersQuery = z.object({
  page,
  search,
  role: z.enum(userRoleEnum.enumValues).optional(),
  verification: z.enum(["verified", "unverified"]).optional(),
});

router.get("/users", async (req, res) => {
  const q = usersQuery.safeParse(req.query);
  if (!q.success) return badRequest(res, q.error);
  const where = and(
    q.data.search
      ? or(ilike(usersTable.name, escapeLike(q.data.search)), ilike(usersTable.email, escapeLike(q.data.search)))
      : undefined,
    q.data.role ? eq(usersTable.role, q.data.role) : undefined,
    q.data.verification ? eq(usersTable.verified, q.data.verification === "verified") : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(usersTable)
      .where(where)
      .orderBy(desc(usersTable.createdAt), desc(usersTable.id))
      .limit(PAGE_SIZE)
      .offset(offset(q.data.page)),
    db.select({ total: count() }).from(usersTable).where(where),
  ]);
  res.json(pageOf(rows.map(toAdminUser), total, q.data.page));
});

const productListing = (p: typeof productsTable.$inferSelect, owner: string | null) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  price: p.price,
  category: p.category,
  owner: owner ?? "Unknown seller",
  ownerId: p.sellerId,
  status: p.status,
  hold: p.moderationHold,
  createdAt: p.createdAt.toISOString(),
});
const serviceListing = (s: typeof servicesTable.$inferSelect, owner: string | null) => ({
  id: s.id,
  title: s.title,
  description: s.description,
  price: s.hourlyRate,
  category: s.category,
  owner: owner ?? "Unknown provider",
  ownerId: s.providerId,
  status: s.status,
  hold: s.moderationHold,
  createdAt: s.createdAt.toISOString(),
});

router.get("/users/:id", async (req, res) => {
  const userId = id.safeParse(req.params.id);
  const [user] = userId.success ? await db.select().from(usersTable).where(eq(usersTable.id, userId.data)) : [];
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const [products, services, activity] = await Promise.all([
    db.select().from(productsTable).where(eq(productsTable.sellerId, user.id)).orderBy(desc(productsTable.createdAt)).limit(100),
    db.select().from(servicesTable).where(eq(servicesTable.providerId, user.id)).orderBy(desc(servicesTable.createdAt)).limit(100),
    db
      .select()
      .from(adminAuditTable)
      .where(eq(adminAuditTable.targetId, user.id))
      .orderBy(desc(adminAuditTable.createdAt), desc(adminAuditTable.id))
      .limit(100),
  ]);
  res.json({
    user: toAdminUser(user),
    listings: [
      ...products.map((p) => ({ ...productListing(p, user.name), kind: "product" as const })),
      ...services.map((s) => ({ ...serviceListing(s, user.name), kind: "service" as const })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    activity: activity.map(toAuditEntry),
  });
});

const accountChange = z.discriminatedUnion("action", [
  z.object({
    id: z.string().optional(),
    action: z.literal("status"),
    value: z.enum(["active", "suspended"]),
    expected: z.enum(["active", "suspended"]),
    reason,
  }),
  z.object({
    id: z.string().optional(),
    action: z.literal("role"),
    value: z.enum(userRoleEnum.enumValues),
    expected: z.enum(userRoleEnum.enumValues),
    reason,
  }),
]);

// Suspension revokes every session at once; a role change applies on the
// next request because sessions read the stored role each time.
router.post("/users/:id/account", async (req: AuthenticatedRequest, res) => {
  const targetId = id.safeParse(req.params.id);
  const body = accountChange.safeParse(req.body);
  if (!targetId.success) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (!body.success) return badRequest(res, body.error);
  const change = body.data;
  if (change.id && change.id !== targetId.data) {
    res.status(400).json({ error: "Check the request and try again." });
    return;
  }
  await decide(res, async (tx) => {
    // Lock both accounts in a fixed order so concurrent decisions can't deadlock.
    const [firstId, secondId] = [req.auth!.userId, targetId.data].sort();
    await tx.select({ id: usersTable.id }).from(usersTable).where(inArray(usersTable.id, [firstId, secondId])).orderBy(asc(usersTable.id)).for("update");
    const actor = await lockActingManager(tx, req.auth!.userId);
    const [target] = await tx.select().from(usersTable).where(eq(usersTable.id, targetId.data));
    if (!target) throw new AdminError(404, "User not found.");
    if (target.id === actor.id)
      throw new AdminError(403, "You can't change your own role or account status. Ask another manager.");
    const current = change.action === "role" ? target.role : accountStatus(target);
    if (current !== change.expected)
      throw new AdminError(409, "This account changed. Cancel and refresh before trying again.");
    if (current === change.value) throw new AdminError(400, "Choose a different value.");
    const removesManager =
      target.role === "manager" &&
      !target.suspendedAt &&
      (change.action === "status" ? change.value === "suspended" : change.value !== "manager");
    if (removesManager) {
      const others = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.role, "manager"), isNull(usersTable.suspendedAt), ne(usersTable.id, target.id)))
        .for("update");
      if (!others.length) throw new AdminError(409, "Fotizo needs at least one active manager.");
    }
    let updated;
    if (change.action === "status") {
      [updated] = await tx
        .update(usersTable)
        .set({
          suspendedAt: change.value === "suspended" ? new Date() : null,
          accountStatusVersion: target.accountStatusVersion + 1,
        })
        .where(eq(usersTable.id, target.id))
        .returning();
      // Reinstatement also clears sessions: an old copied cookie never becomes usable again.
      await tx.delete(sessionsTable).where(eq(sessionsTable.userId, target.id));
    } else {
      [updated] = await tx.update(usersTable).set({ role: change.value }).where(eq(usersTable.id, target.id)).returning();
    }
    await recordAudit(tx, {
      actor,
      action:
        change.action === "role" ? "user.change_role" : change.value === "suspended" ? "user.suspend" : "user.reinstate",
      targetType: "user",
      targetId: target.id,
      targetLabel: target.name,
      reason: change.reason,
      before: { [change.action]: current },
      after: { [change.action]: change.value },
    });
    return { user: toAdminUser(updated) };
  });
});

// ── Listings and publication ────────────────────────────────────────────────
const listingsQuery = z.object({
  page,
  search,
  kind: z.enum(["product", "service"]),
  status: z.enum(["active", "unpublished"]).optional(),
});

router.get("/listings", async (req, res) => {
  const q = listingsQuery.safeParse(req.query);
  if (!q.success) return badRequest(res, q.error);
  const term = q.data.search ? escapeLike(q.data.search) : null;
  if (q.data.kind === "product") {
    const where = and(
      term ? or(ilike(productsTable.title, term), ilike(usersTable.name, term)) : undefined,
      q.data.status ? eq(productsTable.status, q.data.status) : undefined,
    );
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ product: productsTable, owner: usersTable.name })
        .from(productsTable)
        .leftJoin(usersTable, eq(usersTable.id, productsTable.sellerId))
        .where(where)
        .orderBy(desc(productsTable.createdAt), desc(productsTable.id))
        .limit(PAGE_SIZE)
        .offset(offset(q.data.page)),
      db.select({ total: count() }).from(productsTable).leftJoin(usersTable, eq(usersTable.id, productsTable.sellerId)).where(where),
    ]);
    res.json(pageOf(rows.map((r) => productListing(r.product, r.owner)), total, q.data.page));
    return;
  }
  const where = and(
    term ? or(ilike(servicesTable.title, term), ilike(usersTable.name, term)) : undefined,
    q.data.status ? eq(servicesTable.status, q.data.status) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ service: servicesTable, owner: usersTable.name })
      .from(servicesTable)
      .leftJoin(usersTable, eq(usersTable.id, servicesTable.providerId))
      .where(where)
      .orderBy(desc(servicesTable.createdAt), desc(servicesTable.id))
      .limit(PAGE_SIZE)
      .offset(offset(q.data.page)),
    db.select({ total: count() }).from(servicesTable).leftJoin(usersTable, eq(usersTable.id, servicesTable.providerId)).where(where),
  ]);
  res.json(pageOf(rows.map((r) => serviceListing(r.service, r.owner)), total, q.data.page));
});

const decision = z.discriminatedUnion("kind", [
  z.object({ id: z.string().optional(), kind: z.literal("user"), verified: z.boolean(), expected: z.boolean(), reason }),
  z.object({
    id: z.string().optional(),
    kind: z.enum(["product", "service"]),
    status: z.enum(["active", "unpublished"]),
    expected: z.enum(["active", "unpublished"]),
    reason,
  }),
]);

// Verification of accounts, and publication of listings. Staff unpublishing
// places a hold the owner cannot clear; staff publishing lifts it.
router.post("/decisions/:id", async (req: AuthenticatedRequest, res) => {
  const targetId = id.safeParse(req.params.id);
  const body = decision.safeParse(req.body);
  if (!targetId.success) {
    res.status(404).json({ error: "Record not found." });
    return;
  }
  if (!body.success) return badRequest(res, body.error);
  const d = body.data;
  if (d.id && d.id !== targetId.data) {
    res.status(400).json({ error: "Check the request and try again." });
    return;
  }
  await decide(res, async (tx) => {
    const actor = await lockActingManager(tx, req.auth!.userId);
    const stale = () => new AdminError(409, "Record changed. Refresh and review it again.");
    if (d.kind === "user") {
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, targetId.data)).for("update");
      if (!user) throw new AdminError(404, "User not found.");
      if (user.verified !== d.expected || d.verified === d.expected) throw stale();
      await tx.update(usersTable).set({ verified: d.verified }).where(eq(usersTable.id, user.id));
      await recordAudit(tx, {
        actor,
        action: d.verified ? "user.verify" : "user.revoke_verification",
        targetType: "user",
        targetId: user.id,
        targetLabel: user.name,
        reason: d.reason,
        before: { verified: user.verified },
        after: { verified: d.verified },
      });
      return;
    }
    const table = d.kind === "product" ? productsTable : servicesTable;
    const [listing] = await tx
      .select({ id: table.id, title: table.title, status: table.status, hold: table.moderationHold })
      .from(table)
      .where(eq(table.id, targetId.data))
      .for("update");
    if (!listing) throw new AdminError(404, "Listing not found.");
    if (listing.status !== d.expected || d.status === d.expected) throw stale();
    const hold = d.status === "unpublished";
    await tx.update(table).set({ status: d.status, moderationHold: hold }).where(eq(table.id, listing.id));
    await recordAudit(tx, {
      actor,
      action: `${d.kind}.${d.status === "active" ? "publish" : "unpublish"}`,
      targetType: d.kind,
      targetId: listing.id,
      targetLabel: listing.title,
      reason: d.reason,
      before: { status: listing.status, hold: listing.hold },
      after: { status: d.status, hold },
    });
  });
});

// ── Listing approvals ───────────────────────────────────────────────────────
const approvalsQuery = z.object({
  page,
  search,
  status: z.enum(["pending", "approved", "rejected"]),
  kind: z.enum(["product", "service"]).optional(),
});

router.get("/approvals", async (req, res) => {
  const q = approvalsQuery.safeParse(req.query);
  if (!q.success) return badRequest(res, q.error);
  const term = q.data.search ? escapeLike(q.data.search) : null;
  // Counts follow the search and type filters but not the selected status.
  const base = and(
    q.data.kind ? eq(listingReviewsTable.kind, q.data.kind) : undefined,
    term
      ? or(
          ilike(sql`${listingReviewsTable.snapshot}->>'title'`, term),
          ilike(usersTable.name, term),
          ilike(usersTable.email, term),
        )
      : undefined,
  );
  const where = and(base, eq(listingReviewsTable.status, q.data.status));
  const [rows, counts] = await Promise.all([
    db
      .select({ review: listingReviewsTable, seller: usersTable })
      .from(listingReviewsTable)
      .innerJoin(usersTable, eq(usersTable.id, listingReviewsTable.sellerId))
      .where(where)
      .orderBy(desc(listingReviewsTable.submittedAt), desc(listingReviewsTable.id))
      .limit(PAGE_SIZE)
      .offset(offset(q.data.page)),
    db
      .select({ status: listingReviewsTable.status, n: count() })
      .from(listingReviewsTable)
      .innerJoin(usersTable, eq(usersTable.id, listingReviewsTable.sellerId))
      .where(base)
      .groupBy(listingReviewsTable.status),
  ]);
  const events = rows.length
    ? await db
        .select()
        .from(listingReviewEventsTable)
        .where(inArray(listingReviewEventsTable.reviewId, rows.map((r) => r.review.id)))
        .orderBy(desc(listingReviewEventsTable.createdAt), desc(listingReviewEventsTable.version))
    : [];
  const tally = { pending: 0, approved: 0, rejected: 0 };
  for (const c of counts) tally[c.status] = c.n;
  res.json({
    ...pageOf(
      rows.map(({ review, seller }) => ({
        id: review.id,
        listingId: review.listingId,
        kind: review.kind,
        title: review.snapshot.title,
        description: review.snapshot.description,
        category: review.snapshot.category,
        price: review.snapshot.price,
        currency: review.snapshot.currency,
        images: review.snapshot.images,
        seller: { id: seller.id, name: seller.name, email: seller.email, verified: seller.verified },
        status: review.status,
        version: review.version,
        submittedAt: review.submittedAt.toISOString(),
        history: events
          .filter((e) => e.reviewId === review.id)
          .map((e) => ({
            id: e.id,
            action: e.action,
            actor: e.actorName,
            reason: e.reason,
            version: e.version,
            createdAt: e.createdAt.toISOString(),
          })),
      })),
      tally[q.data.status],
      q.data.page,
    ),
    counts: tally,
  });
});

const approvalDecision = z.object({
  id: z.string().optional(),
  expectedVersion: z.number().int().min(1),
  outcome: z.enum(["approved", "rejected"]),
  reason,
});

// Approval and publication are separate: rejecting takes the listing down
// with a hold and tells the seller why; approving lifts the hold but leaves
// republishing to the seller (or to publication controls).
router.post("/approvals/:id/decision", async (req: AuthenticatedRequest, res) => {
  const reviewId = id.safeParse(req.params.id);
  const body = approvalDecision.safeParse(req.body);
  if (!reviewId.success) {
    res.status(404).json({ error: "Submission not found." });
    return;
  }
  if (!body.success) return badRequest(res, body.error);
  const d = body.data;
  await decide(res, async (tx) => {
    const actor = await lockActingManager(tx, req.auth!.userId);
    const [review] = await tx.select().from(listingReviewsTable).where(eq(listingReviewsTable.id, reviewId.data)).for("update");
    if (!review) throw new AdminError(404, "Submission not found.");
    if (review.status !== "pending" || review.version !== d.expectedVersion)
      throw new AdminError(409, "This submission changed. Close the review and refresh the queue.");
    const now = new Date();
    await tx.update(listingReviewsTable).set({ status: d.outcome, decidedAt: now }).where(eq(listingReviewsTable.id, review.id));
    await tx.insert(listingReviewEventsTable).values({
      reviewId: review.id,
      action: d.outcome,
      actorId: actor.id,
      actorName: actor.name,
      reason: d.reason,
      version: review.version,
      createdAt: now,
    });
    const table = review.kind === "product" ? productsTable : servicesTable;
    if (d.outcome === "rejected")
      await tx.update(table).set({ status: "unpublished", moderationHold: true }).where(eq(table.id, review.listingId));
    else await tx.update(table).set({ moderationHold: false }).where(eq(table.id, review.listingId));
    await recordAudit(tx, {
      actor,
      action: `submission.${d.outcome}`,
      targetType: "submission",
      targetId: review.id,
      targetLabel: review.snapshot.title,
      reason: d.reason,
      before: { status: "pending", version: review.version },
      after: { status: d.outcome, version: review.version },
    });
  });
});

// ── Orders and disputes ─────────────────────────────────────────────────────
const ORDER_STATES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
const opsQuery = (states: readonly [string, ...string[]]) => z.object({ page, search, status: z.enum(states).optional() });

// Order-level state from its lines: a multi-seller order is as far along as
// its least advanced open line.
const ORDER_STATE_SQL = sql`CASE
  WHEN bool_and(oi.status = 'cancelled') THEN 'cancelled'
  WHEN bool_and(oi.status IN ('delivered', 'cancelled')) THEN 'delivered'
  WHEN bool_and(oi.status IN ('shipped', 'delivered', 'cancelled')) THEN 'shipped'
  WHEN bool_or(oi.status IN ('processing', 'shipped', 'delivered')) THEN 'processing'
  ELSE 'pending' END`;

router.get("/orders", async (req, res) => {
  const q = opsQuery(ORDER_STATES).safeParse(req.query);
  if (!q.success) return badRequest(res, q.error);
  const term = q.data.search ? escapeLike(q.data.search) : null;
  const result = await db.execute<{ id: string; total: number }>(sql`
    WITH summary AS (
      SELECT o.id, o.created_at, ${ORDER_STATE_SQL} AS state,
             concat_ws(' ', o.reference, b.name, b.email, string_agg(oi.seller, ' '), string_agg(s.email, ' ')) AS haystack
      FROM orders o
      JOIN users b ON b.id = o.buyer_id
      JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN users s ON s.id = oi.seller_id
      GROUP BY o.id, b.name, b.email
    )
    SELECT id, (count(*) OVER ())::int AS total FROM summary
    WHERE (${q.data.status ?? null}::text IS NULL OR state = ${q.data.status ?? null})
      AND (${term}::text IS NULL OR haystack ILIKE ${term})
    ORDER BY created_at DESC, id DESC
    LIMIT ${PAGE_SIZE} OFFSET ${offset(q.data.page)}`);
  const ids = result.rows.map((r) => r.id);
  const orders = await managedOrders(ids);
  res.json(pageOf(ids.map((i) => orders.get(i)!).filter(Boolean), Number(result.rows[0]?.total ?? 0), q.data.page));
});

async function managedDisputes(where: SQL | undefined, limit: number, skip: number) {
  const rows = await db
    .select()
    .from(disputesTable)
    .where(where)
    .orderBy(desc(disputesTable.createdAt), desc(disputesTable.id))
    .limit(limit)
    .offset(skip);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [statements, events] = await Promise.all([
    db.select().from(disputeStatementsTable).where(inArray(disputeStatementsTable.disputeId, ids)).orderBy(asc(disputeStatementsTable.createdAt)),
    db
      .select()
      .from(disputeEventsTable)
      .where(inArray(disputeEventsTable.disputeId, ids))
      .orderBy(desc(disputeEventsTable.createdAt), desc(disputeEventsTable.version)),
  ]);
  return rows.map((d) => ({
    id: d.id,
    reference: d.reference,
    orderId: d.orderId,
    category: DISPUTE_CATEGORY_LABELS[d.category],
    summary: d.summary,
    status: d.status,
    priority: d.priority,
    createdAt: d.createdAt.toISOString(),
    version: d.version,
    evidence: statements
      .filter((s) => s.disputeId === d.id)
      .map((s) => ({ submittedBy: s.authorName, statement: s.statement, createdAt: s.createdAt.toISOString() })),
    history: events
      .filter((e) => e.disputeId === d.id)
      .map((e) => ({ id: e.id, actor: e.actorName, action: e.action, reason: e.reason, createdAt: e.createdAt.toISOString() })),
  }));
}

router.get("/orders/:id", async (req, res) => {
  const orderId = id.safeParse(req.params.id);
  const orders = orderId.success ? await managedOrders([orderId.data]) : new Map();
  const order = orderId.success ? orders.get(orderId.data) : undefined;
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json({ order, disputes: await managedDisputes(eq(disputesTable.orderId, order.id), 50, 0) });
});

router.get("/disputes", async (req, res) => {
  const q = opsQuery(["open", "reviewing", "escalated", "resolved"]).safeParse(req.query);
  if (!q.success) return badRequest(res, q.error);
  const term = q.data.search ? escapeLike(q.data.search) : null;
  const where = and(
    q.data.status ? eq(disputesTable.status, q.data.status as DisputeStatus) : undefined,
    term
      ? sql`EXISTS (
          SELECT 1 FROM orders o JOIN users b ON b.id = o.buyer_id
          JOIN order_items oi ON oi.order_id = o.id LEFT JOIN users s ON s.id = oi.seller_id
          WHERE o.id = ${disputesTable.orderId}
            AND concat_ws(' ', ${disputesTable.reference}, ${disputesTable.category}, o.reference, b.name, b.email, oi.seller, s.email) ILIKE ${term})`
      : undefined,
  );
  const [items, [{ total }]] = await Promise.all([
    managedDisputes(where, PAGE_SIZE, offset(q.data.page)),
    db.select({ total: count() }).from(disputesTable).where(where),
  ]);
  const orders = await managedOrders([...new Set(items.map((d) => d.orderId))]);
  res.json(pageOf(items.map((d) => ({ ...d, order: orders.get(d.orderId)! })), total, q.data.page));
});

const disputeDecision = z.object({
  id: z.string().optional(),
  action: z.enum(["start_review", "escalate_refund", "resolve", "reopen"]),
  expectedVersion: z.number().int().min(1),
  reason,
});

// Requesting refund review escalates the case for finance; it never refunds.
router.post("/disputes/:id/decisions", async (req: AuthenticatedRequest, res) => {
  const disputeId = id.safeParse(req.params.id);
  const body = disputeDecision.safeParse(req.body);
  if (!disputeId.success) {
    res.status(404).json({ error: "Dispute not found." });
    return;
  }
  if (!body.success) return badRequest(res, body.error);
  const d = body.data;
  await decide(res, async (tx) => {
    const actor = await lockActingManager(tx, req.auth!.userId);
    const [dispute] = await tx.select().from(disputesTable).where(eq(disputesTable.id, disputeId.data)).for("update");
    if (!dispute) throw new AdminError(404, "Dispute not found.");
    if (dispute.version !== d.expectedVersion)
      throw new AdminError(409, "This dispute changed. Cancel and refresh before trying again.");
    const next = DISPUTE_ACTIONS[dispute.status][d.action];
    if (!next) throw new AdminError(409, "This action is not available for the current dispute status.");
    const version = dispute.version + 1;
    try {
      await tx
        .update(disputesTable)
        .set({ status: next, version, updatedAt: new Date() })
        .where(eq(disputesTable.id, dispute.id));
    } catch (error) {
      // Reopening while another dispute on the same order is active.
      if (isUniqueViolation(error))
        throw new AdminError(409, "This order already has another open dispute.");
      throw error;
    }
    await tx.insert(disputeEventsTable).values({
      disputeId: dispute.id,
      actorId: actor.id,
      actorName: actor.name,
      action: DISPUTE_ACTION_LABELS[d.action],
      reason: d.reason,
      fromStatus: dispute.status,
      toStatus: next,
      version,
    });
    await recordAudit(tx, {
      actor,
      action: `dispute.${d.action}`,
      targetType: "dispute",
      targetId: dispute.id,
      targetLabel: dispute.reference,
      reason: d.reason,
      before: { status: dispute.status, version: dispute.version },
      after: { status: next, version },
    });
  });
});

// ── Audit trail ─────────────────────────────────────────────────────────────
router.get("/audit", async (req, res) => {
  const q = z.object({ page }).safeParse(req.query);
  if (!q.success) return badRequest(res, q.error);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(adminAuditTable)
      .orderBy(desc(adminAuditTable.createdAt), desc(adminAuditTable.id))
      .limit(PAGE_SIZE)
      .offset(offset(q.data.page)),
    db.select({ total: count() }).from(adminAuditTable),
  ]);
  res.json(pageOf(rows.map(toAuditEntry), total, q.data.page));
});

export default router;
