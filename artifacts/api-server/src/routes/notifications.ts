import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, inArray, isNull, max } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  pushSubscriptionsTable,
  urgentAlertsTable,
  usersTable,
  deliveryDueAt,
  URGENT_ALERT_INTERVAL_MS,
} from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { notifyUsers, pushPublicKey } from "../lib/notify";

const router: IRouter = Router();

// ── Push subscriptions ──────────────────────────────────────────────────────
router.get("/push/key", (_req, res) => {
  res.json({ publicKey: pushPublicKey() });
});

const subscriptionSchema = z
  .object({
    endpoint: z.string().url().max(1000).startsWith("https://"),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  })
  .passthrough();

router.post("/push/subscriptions", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "This browser sent an invalid notification subscription." });
    return;
  }
  const { endpoint, keys } = parsed.data;
  // A browser has one subscription; signing in as someone else moves it to them.
  await db
    .insert(pushSubscriptionsTable)
    .values({ userId: req.auth!.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { userId: req.auth!.userId, p256dh: keys.p256dh, auth: keys.auth },
    });
  res.status(204).end();
});

router.delete("/push/subscriptions", requireAuth, async (req: AuthenticatedRequest, res) => {
  const endpoint = z.object({ endpoint: z.string().max(1000) }).safeParse(req.body);
  if (!endpoint.success) {
    res.status(400).json({ error: "Say which subscription to remove." });
    return;
  }
  await db
    .delete(pushSubscriptionsTable)
    .where(
      and(
        eq(pushSubscriptionsTable.endpoint, endpoint.data.endpoint),
        eq(pushSubscriptionsTable.userId, req.auth!.userId),
      ),
    );
  res.status(204).end();
});

// ── Urgent alerts on overdue orders ─────────────────────────────────────────
type UrgencyLine = { id: string; status: string; needsConfirmation: boolean };
type UrgencyOrder = { createdAt: Date; acceptedAt: Date | null; deliveryDaysMax: number | null };

/**
 * For each of the buyer's order lines: when it is due, and when the buyer can
 * next send an urgent alert (null once it is delivered or cancelled).
 */
export async function urgencyFor(lines: { line: UrgencyLine; order: UrgencyOrder }[]) {
  const ids = lines.map((l) => l.line.id);
  const last = ids.length
    ? await db
        .select({ id: urgentAlertsTable.orderItemId, at: max(urgentAlertsTable.createdAt) })
        .from(urgentAlertsTable)
        .where(inArray(urgentAlertsTable.orderItemId, ids))
        .groupBy(urgentAlertsTable.orderItemId)
    : [];
  const lastAt = new Map(last.map((r) => [r.id, r.at]));
  return new Map(
    lines.map(({ line, order }) => {
      const due = deliveryDueAt(line, order);
      const previous = lastAt.get(line.id);
      const closed = line.status === "delivered" || line.status === "cancelled";
      const next = previous ? new Date(Math.max(due.getTime(), new Date(previous).getTime() + URGENT_ALERT_INTERVAL_MS)) : due;
      return [
        line.id,
        {
          deliveryDue: due.toISOString(),
          urgentAvailableAt: closed ? null : next.toISOString(),
          lastUrgentAt: previous ? new Date(previous).toISOString() : null,
        },
      ];
    }),
  );
}

const dateLabel = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

router.post("/orders/lines/:id/urgent", requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const now = new Date();
  const outcome = await db.transaction(async (tx) => {
    // Locking the line makes two quick presses send one alert, not two.
    const [found] = await tx
      .select({ line: orderItemsTable, order: ordersTable, channel: productsTable.channel })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .innerJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
      .where(and(eq(orderItemsTable.id, id.data), eq(ordersTable.buyerId, req.auth!.userId)))
      .for("update", { of: orderItemsTable });
    if (!found) return { status: 404 as const, error: "Order not found." };
    const { line, order } = found;
    if (line.status === "delivered" || line.status === "cancelled")
      return { status: 409 as const, error: `This order is already ${line.status}.` };
    const due = deliveryDueAt(line, order);
    if (now < due)
      return {
        status: 409 as const,
        error: `This order is due by ${dateLabel(due)}. You can send an urgent alert if it hasn't arrived by then.`,
      };
    const [previous] = await tx
      .select({ at: urgentAlertsTable.createdAt })
      .from(urgentAlertsTable)
      .where(eq(urgentAlertsTable.orderItemId, line.id))
      .orderBy(desc(urgentAlertsTable.createdAt))
      .limit(1);
    if (previous && now.getTime() - previous.at.getTime() < URGENT_ALERT_INTERVAL_MS) {
      const next = new Date(previous.at.getTime() + URGENT_ALERT_INTERVAL_MS);
      return {
        status: 429 as const,
        retryAfter: Math.ceil((next.getTime() - now.getTime()) / 1000),
        error: "You've already sent an urgent alert for this order today. You can send another 24 hours after the last one.",
        next,
      };
    }
    const [alert] = await tx
      .insert(urgentAlertsTable)
      .values({ orderItemId: line.id, buyerId: req.auth!.userId, createdAt: now })
      .returning();
    return { status: 201 as const, alert, line, order, due, shop: found.channel === "shop" };
  });

  if (outcome.status !== 201) {
    if (outcome.status === 429) res.setHeader("Retry-After", outcome.retryAfter);
    res.status(outcome.status).json({
      error: outcome.error,
      ...(outcome.status === 429 ? { urgentAvailableAt: outcome.next.toISOString() } : {}),
    });
    return;
  }

  const { alert, line, order, due, shop } = outcome;
  const notice = {
    title: "Urgent: a buyer is waiting for their order",
    body: `Order ${order.reference ?? order.id.slice(0, 8)}: ${line.productTitle} (×${line.quantity}) was due by ${dateLabel(due)} and hasn't arrived. Please update the buyer.`,
  };
  // Marketplace lines alert their seller; Fotizo Shop lines alert the staff who fulfil them.
  const groups: { ids: string[]; path: string }[] = [];
  if (shop) {
    const staff = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(and(inArray(usersTable.role, ["china_representative", "manager"]), isNull(usersTable.suspendedAt)));
    groups.push(
      { ids: staff.filter((s) => s.role === "china_representative").map((s) => s.id), path: "/dashboard/china_representative?tab=confirmations" },
      { ids: staff.filter((s) => s.role === "manager").map((s) => s.id), path: "/dashboard/manager?tab=orders" },
    );
  } else groups.push({ ids: [line.sellerId], path: "/dashboard/seller?tab=orders" });

  let pushSent = 0;
  let emailSent = 0;
  for (const group of groups) {
    const sent = await notifyUsers(group.ids, { ...notice, path: group.path });
    pushSent += sent.pushSent;
    emailSent += sent.emailSent;
  }
  await db.update(urgentAlertsTable).set({ pushSent, emailSent }).where(eq(urgentAlertsTable.id, alert.id));
  res.status(201).json({
    sentAt: alert.createdAt.toISOString(),
    urgentAvailableAt: new Date(alert.createdAt.getTime() + URGENT_ALERT_INTERVAL_MS).toISOString(),
    // Whether anyone could be reached right away (a device or an inbox).
    delivered: pushSent + emailSent > 0,
  });
});

export default router;
