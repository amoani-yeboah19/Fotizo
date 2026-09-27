import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  DISPUTE_CATEGORIES,
  disputesTable,
  disputeEventsTable,
  disputeStatementsTable,
  ordersTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { caseReference } from "../lib/cases";
import { isUniqueViolation } from "../lib/admin";
import { DISPUTE_CATEGORY_LABELS, disputePriority } from "../lib/disputes";

// Buyers report a problem with one of their orders; staff handle it in the
// manager workspace. A dispute never moves money by itself.
const router: IRouter = Router();

async function buyersOrder(req: AuthenticatedRequest) {
  const orderId = z.string().uuid().safeParse(req.params.id);
  if (!orderId.success) return undefined;
  const [order] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId.data), eq(ordersTable.buyerId, req.auth!.userId)));
  return order;
}

const toBuyerDispute = (d: typeof disputesTable.$inferSelect) => ({
  id: d.id,
  reference: d.reference,
  category: d.category,
  categoryLabel: DISPUTE_CATEGORY_LABELS[d.category],
  status: d.status,
  createdAt: d.createdAt.toISOString(),
});

router.get("/orders/:id/disputes", requireAuth, async (req: AuthenticatedRequest, res) => {
  const order = await buyersOrder(req);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const rows = await db
    .select()
    .from(disputesTable)
    .where(eq(disputesTable.orderId, order.id))
    .orderBy(desc(disputesTable.createdAt));
  res.json(rows.map(toBuyerDispute));
});

const newDispute = z
  .object({
    category: z.enum(DISPUTE_CATEGORIES),
    summary: z.string().trim().min(10, "Describe the problem in at least 10 characters.").max(2000),
  })
  .strict();

router.post("/orders/:id/disputes", requireAuth, async (req: AuthenticatedRequest, res) => {
  const order = await buyersOrder(req);
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const body = newDispute.safeParse(req.body);
  if (!body.success) {
    const message = body.error.issues[0]?.message;
    res.status(400).json({ error: message?.startsWith("Describe") ? message : "Choose what went wrong and describe the problem." });
    return;
  }
  try {
    const created = await db.transaction(async (tx) => {
      const [buyer] = await tx.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.auth!.userId));
      const [dispute] = await tx
        .insert(disputesTable)
        .values({
          reference: caseReference("FZD"),
          orderId: order.id,
          openedBy: buyer.id,
          category: body.data.category,
          summary: body.data.summary,
          priority: disputePriority(body.data.category),
        })
        .returning();
      await tx.insert(disputeStatementsTable).values({
        disputeId: dispute.id,
        authorId: buyer.id,
        authorName: buyer.name,
        statement: body.data.summary,
      });
      await tx.insert(disputeEventsTable).values({
        disputeId: dispute.id,
        actorId: buyer.id,
        actorName: buyer.name,
        action: "Dispute opened",
        reason: DISPUTE_CATEGORY_LABELS[body.data.category],
        toStatus: "open",
        version: 1,
      });
      return dispute;
    });
    res.status(201).json(toBuyerDispute(created));
  } catch (error) {
    // The partial unique index allows one unresolved dispute per order.
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "This order already has an open dispute. We'll update you on it." });
      return;
    }
    throw error;
  }
});

export default router;
