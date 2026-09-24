import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, bookingsTable, servicesTable, usersTable, type BookingRow, type BookingStatus } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { caseReference } from "../lib/cases";

// Service bookings are requests: the customer proposes a package and time, the
// provider confirms or declines. Payment is arranged offline.
const router: IRouter = Router();
router.use(["/bookings", "/provider/bookings"], requireAuth);

const MAX_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;
const provider = alias(usersTable, "provider");
const buyer = alias(usersTable, "buyer");

function toPublicBooking(row: BookingRow, names: { provider: string; providerAvatar: string | null; buyer: string }) {
  return {
    id: row.id,
    reference: row.reference,
    serviceId: row.serviceId,
    serviceTitle: row.serviceTitle,
    provider: names.provider,
    providerAvatar: names.providerAvatar ?? "",
    buyer: names.buyer,
    package: row.packageName,
    price: row.packagePrice,
    scheduledFor: row.scheduledFor.toISOString(),
    timezone: row.timezone,
    notes: row.notes,
    status: row.status,
    statusVersion: row.statusVersion,
    providerNote: row.providerNote,
    meetingLink: row.meetingLink,
    createdAt: row.createdAt.toISOString(),
  };
}

async function listFor(side: "buyer" | "provider", userId: string) {
  const rows = await db
    .select({ booking: bookingsTable, providerName: provider.name, providerAvatar: provider.avatar, buyerName: buyer.name })
    .from(bookingsTable)
    .innerJoin(provider, eq(provider.id, bookingsTable.providerId))
    .innerJoin(buyer, eq(buyer.id, bookingsTable.buyerId))
    .where(eq(side === "buyer" ? bookingsTable.buyerId : bookingsTable.providerId, userId))
    .orderBy(desc(bookingsTable.scheduledFor), desc(bookingsTable.id))
    .limit(200);
  return rows.map((r) =>
    toPublicBooking(r.booking, { provider: r.providerName, providerAvatar: r.providerAvatar, buyer: r.buyerName }),
  );
}

router.get("/bookings", async (req: AuthenticatedRequest, res) => {
  res.json(await listFor("buyer", req.auth!.userId));
});
router.get("/provider/bookings", async (req: AuthenticatedRequest, res) => {
  res.json(await listFor("provider", req.auth!.userId));
});

const requestSchema = z
  .object({
    serviceId: z.string().uuid(),
    packageName: z.string().trim().min(1).max(120),
    scheduledFor: z.string().datetime({ offset: true }),
    timezone: z.string().trim().min(1).max(64),
    notes: z.string().trim().max(2000).default(""),
  })
  .strict();

router.post("/bookings", async (req: AuthenticatedRequest, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a package, a date and a time; messages are up to 2000 characters." });
    return;
  }
  const when = new Date(parsed.data.scheduledFor);
  const now = Date.now();
  if (when.getTime() <= now || when.getTime() > now + MAX_AHEAD_MS) {
    res.status(400).json({ error: "Choose a date and time in the future, within the next year." });
    return;
  }
  const [service] = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.id, parsed.data.serviceId), eq(servicesTable.status, "active")));
  if (!service) {
    res.status(404).json({ error: "This service is no longer available." });
    return;
  }
  if (service.providerId === req.auth!.userId) {
    res.status(409).json({ error: "You cannot book your own service." });
    return;
  }
  const pkg = service.packages.find((p) => p.name === parsed.data.packageName);
  if (!pkg) {
    res.status(409).json({ error: "That package is no longer offered. Refresh and choose again." });
    return;
  }
  const [row] = await db
    .insert(bookingsTable)
    .values({
      reference: caseReference("FZB"),
      serviceId: service.id,
      providerId: service.providerId,
      buyerId: req.auth!.userId,
      serviceTitle: service.title,
      packageName: pkg.name,
      packagePrice: pkg.price,
      scheduledFor: when,
      timezone: parsed.data.timezone,
      notes: parsed.data.notes,
    })
    .returning();
  const [names] = await db
    .select({ provider: provider.name, providerAvatar: provider.avatar, buyer: buyer.name })
    .from(provider)
    .innerJoin(buyer, eq(buyer.id, row.buyerId))
    .where(eq(provider.id, row.providerId));
  res.status(201).json(toPublicBooking(row, names));
});

// Who may move a booking where. The customer can only withdraw; the provider
// decides on requests and records the outcome.
const PROVIDER_MOVES: Partial<Record<BookingStatus, BookingStatus[]>> = {
  requested: ["confirmed", "declined"],
  confirmed: ["completed", "cancelled"],
};
const BUYER_MOVES: Partial<Record<BookingStatus, BookingStatus[]>> = {
  requested: ["cancelled"],
  confirmed: ["cancelled"],
};
const changeSchema = z
  .object({
    status: z.enum(["confirmed", "declined", "cancelled", "completed"]),
    expectedVersion: z.number().int().min(0),
    note: z.string().trim().max(1000).optional(),
    meetingLink: z.string().trim().url().max(500).optional(),
  })
  .strict();

router.post("/bookings/:id/status", async (req: AuthenticatedRequest, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const body = changeSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: "Choose a valid booking status; notes are up to 1000 characters." });
    return;
  }
  const userId = req.auth!.userId;
  const outcome = await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookingsTable).where(eq(bookingsTable.id, id.data)).for("update");
    const role = booking?.providerId === userId ? "provider" : booking?.buyerId === userId ? "buyer" : null;
    if (!booking || !role) return { status: 404 as const, error: "Booking not found." };
    if (booking.statusVersion !== body.data.expectedVersion)
      return { status: 409 as const, error: "This booking changed since you loaded it. Refresh and try again." };
    const allowed = (role === "provider" ? PROVIDER_MOVES : BUYER_MOVES)[booking.status] ?? [];
    if (!allowed.includes(body.data.status))
      return { status: 409 as const, error: `A ${booking.status} booking cannot be marked ${body.data.status}.` };
    const [updated] = await tx
      .update(bookingsTable)
      .set({
        status: body.data.status,
        statusVersion: booking.statusVersion + 1,
        updatedAt: new Date(),
        ...(role === "provider" && body.data.note !== undefined ? { providerNote: body.data.note } : {}),
        ...(role === "provider" && body.data.meetingLink ? { meetingLink: body.data.meetingLink } : {}),
      })
      .where(eq(bookingsTable.id, booking.id))
      .returning();
    return { status: 200 as const, booking: updated };
  });
  if (outcome.status !== 200) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }
  res.json({ id: outcome.booking.id, status: outcome.booking.status, statusVersion: outcome.booking.statusVersion });
});

export default router;
