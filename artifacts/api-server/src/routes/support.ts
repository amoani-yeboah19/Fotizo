import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, supportRequestsTable, SUPPORT_TOPICS } from "@workspace/db";
import { consumeAuthAttempt } from "../middlewares/security";
import { caseReference, optionalUserId } from "../lib/cases";

const router: IRouter = Router();

const supportSchema = z
  .object({
    topic: z.enum(SUPPORT_TOPICS),
    orderRef: z.string().trim().max(60).default(""),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).default(""),
    message: z.string().trim().min(1).max(4000),
  })
  .strict();

// Public: customers often cannot sign in when they need help. A signed-in
// request is linked to the account so staff can see who raised it.
router.post("/support-requests", async (req, res) => {
  const parsed = supportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error:
        "Choose a topic and enter your name, a valid email address and a message of up to 4000 characters.",
    });
    return;
  }
  const limit = await consumeAuthAttempt(`support:${req.ip ?? "unknown"}`, 10);
  if (!limit.allowed) {
    res.setHeader("Retry-After", limit.retryAfter);
    res.status(429).json({
      error: "Too many requests from this connection. Please try again later.",
    });
    return;
  }
  const [row] = await db
    .insert(supportRequestsTable)
    .values({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      reference: caseReference("FZS"),
      userId: await optionalUserId(req),
    })
    .returning();
  res.status(201).json({
    id: row.id,
    reference: row.reference,
    topic: row.topic,
    orderRef: row.orderRef,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
