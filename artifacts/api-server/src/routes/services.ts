import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { db, servicesTable, usersTable, type ServiceRow } from "@workspace/db";
import {
  SERVICE_GROUPS,
  SERVICE_CATEGORIES,
  groupForCategory,
  isServiceCategoryId,
  type ServiceGroupId,
} from "@workspace/service-taxonomy";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { HOLD_MESSAGE, moderationFor, sameSnapshot, serviceSnapshot, submitForReview } from "../lib/admin";

const router: IRouter = Router();

const GROUP_IDS = SERVICE_GROUPS.map((g) => g.id) as [ServiceGroupId, ...ServiceGroupId[]];

const packageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().positive(),
  delivery: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000),
});

const newServiceSchema = z.object({
  title: z.string().trim().min(3).max(200),
  // Must be a known taxonomy id — the group is derived from it below, so an
  // unrecognised category has nowhere to file the listing.
  category: z.string().trim().refine(isServiceCategoryId, "Unknown service category."),
  description: z.string().trim().min(20).max(5000),
  experience: z.string().trim().min(1).max(80),
  hourlyRate: z.number().positive(),
  availability: z.string().trim().min(1).max(80),
  skills: z.array(z.string().trim().min(1)).min(1).max(20),
  avatar: z.string().trim().min(1),
  packages: z.array(packageSchema).min(1).max(3),
});

// Shape returned to the client — provider name is looked up via the FK at
// read time rather than stored on the row, so a renamed provider never goes
// stale (same reasoning as toPublicProduct in products.ts).
function toPublicService(row: ServiceRow, providerName: string) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    provider: providerName,
    providerId: row.providerId,
    avatar: row.avatar,
    rating: row.rating,
    reviewCount: row.reviewCount,
    experience: row.experience,
    hourlyRate: row.hourlyRate,
    category: row.category,
    availability: row.availability,
    group: row.group,
    packages: row.packages,
    skills: row.skills,
    status: row.status,
  };
}

// The taxonomy itself, so the web app's dropdown and this server can never
// disagree about which group a category belongs to.
router.get("/service-taxonomy", (_req, res) => {
  res.json({ groups: SERVICE_GROUPS, categories: SERVICE_CATEGORIES });
});

const listQuerySchema = z.object({
  group: z.enum(GROUP_IDS).optional(),
  category: z.string().trim().refine(isServiceCategoryId, "Unknown service category.").optional(),
});

router.get("/services", async (req, res) => {
  const parsedQuery = listQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: "Invalid filter.", issues: parsedQuery.error.issues });
    return;
  }
  const { group, category } = parsedQuery.data;

  const filters: SQL[] = [eq(servicesTable.status, "active")];
  if (group) filters.push(eq(servicesTable.group, group));
  if (category) filters.push(eq(servicesTable.category, category));

  const rows = await db
    .select({ service: servicesTable, providerName: usersTable.name })
    .from(servicesTable)
    .leftJoin(usersTable, eq(servicesTable.providerId, usersTable.id))
    .where(and(...filters))
    .orderBy(desc(servicesTable.createdAt));
  res.json(rows.map((r) => toPublicService(r.service, r.providerName ?? "Unknown provider")));
});

router.get("/services/:id", async (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) {
    res.status(404).json({ error: "Service not found." });
    return;
  }
  const [row] = await db
    .select({ service: servicesTable, providerName: usersTable.name })
    .from(servicesTable)
    .leftJoin(usersTable, eq(servicesTable.providerId, usersTable.id))
    .where(and(eq(servicesTable.id, parsedId.data), eq(servicesTable.status, "active")))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Service not found." });
    return;
  }
  res.json(toPublicService(row.service, row.providerName ?? "Unknown provider"));
});

// Role is enforced server-side, same as products' listing restriction — a
// client can't just claim to be a seller by editing the request body.
router.post("/services", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.auth!.role !== "seller") {
    res.status(403).json({ error: "Only seller accounts can offer services." });
    return;
  }

  const parsed = newServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid service data.", issues: parsed.error.issues });
    return;
  }

  // The group is derived here, never read off the request body — that's what
  // sends a plumber's listing straight to Artisans & Trades without the
  // provider choosing (or being able to spoof) a side.
  const group = groupForCategory(parsed.data.category);
  if (!group) {
    res.status(400).json({ error: "Unknown service category." });
    return;
  }

  const provider = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.auth!.userId) });
  // Listed straight away and queued for staff review in the same transaction.
  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(servicesTable)
      .values({ ...parsed.data, group, providerId: req.auth!.userId })
      .returning();
    if (provider)
      await submitForReview(tx, { kind: "service", listingId: row.id, seller: provider, snapshot: serviceSnapshot(row) });
    return row;
  });
  res.status(201).json(toPublicService(created, provider?.name ?? "Unknown provider"));
});

// ── Provider management ──────────────────────────────────────────────────────
// Providers see and change only their own listings, including withdrawn ones.

/** Provider view of their listings: adds the review outcome and any staff hold. */
async function withModeration(rows: { service: ServiceRow; providerName: string | null }[]) {
  const reviews = await moderationFor(
    "service",
    rows.map((r) => r.service.id),
  );
  return rows.map((r) => ({
    ...toPublicService(r.service, r.providerName ?? "Unknown provider"),
    moderation: {
      review: reviews.get(r.service.id)?.status ?? null,
      reason: reviews.get(r.service.id)?.reason ?? null,
      held: r.service.moderationHold,
    },
  }));
}

async function ownedService(id: string | string[], providerId: string) {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return null;
  const [row] = await db
    .select({ service: servicesTable, providerName: usersTable.name })
    .from(servicesTable)
    .leftJoin(usersTable, eq(servicesTable.providerId, usersTable.id))
    .where(and(eq(servicesTable.id, parsedId.data), eq(servicesTable.providerId, providerId)));
  return row ?? null;
}

router.get("/provider/services", requireAuth, async (req: AuthenticatedRequest, res) => {
  const rows = await db
    .select({ service: servicesTable, providerName: usersTable.name })
    .from(servicesTable)
    .leftJoin(usersTable, eq(servicesTable.providerId, usersTable.id))
    .where(eq(servicesTable.providerId, req.auth!.userId))
    .orderBy(desc(servicesTable.createdAt))
    .limit(200);
  res.json(await withModeration(rows));
});

router.get("/provider/services/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const row = await ownedService(req.params.id, req.auth!.userId);
  if (!row) {
    res.status(404).json({ error: "Service not found." });
    return;
  }
  res.json((await withModeration([row]))[0]);
});

// Replaces the listing's editable fields. Ratings, reviews and ownership are
// never client-editable; the group is re-derived from the category.
router.patch("/services/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const row = await ownedService(req.params.id, req.auth!.userId);
  if (!row) {
    res.status(404).json({ error: "Service not found." });
    return;
  }
  const parsed = newServiceSchema.strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid service data.", issues: parsed.error.issues });
    return;
  }
  const group = groupForCategory(parsed.data.category);
  if (!group) {
    res.status(400).json({ error: "Unknown service category." });
    return;
  }
  // A content change starts a new review version.
  const updated = await db.transaction(async (tx) => {
    const [saved] = await tx
      .update(servicesTable)
      .set({ ...parsed.data, group })
      .where(and(eq(servicesTable.id, row.service.id), eq(servicesTable.providerId, req.auth!.userId)))
      .returning();
    if (!sameSnapshot(serviceSnapshot(row.service), serviceSnapshot(saved)))
      await submitForReview(tx, {
        kind: "service",
        listingId: saved.id,
        seller: { id: req.auth!.userId, name: row.providerName ?? "Provider" },
        snapshot: serviceSnapshot(saved),
      });
    return saved;
  });
  res.json(toPublicService(updated, row.providerName ?? "Unknown provider"));
});

// Withdrawing hides the listing from customers without deleting it, so
// existing bookings keep their reference; republishing shows it again.
router.post("/services/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  const body = z.object({ status: z.enum(["active", "unpublished"]) }).strict().safeParse(req.body);
  const row = await ownedService(req.params.id, req.auth!.userId);
  if (!row) {
    res.status(404).json({ error: "Service not found." });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: "Choose to publish or withdraw the service." });
    return;
  }
  if (body.data.status === "active" && row.service.moderationHold) {
    res.status(409).json({ error: HOLD_MESSAGE });
    return;
  }
  const [updated] = await db
    .update(servicesTable)
    .set({ status: body.data.status })
    .where(eq(servicesTable.id, row.service.id))
    .returning();
  res.json(toPublicService(updated, row.providerName ?? "Unknown provider"));
});

export default router;
