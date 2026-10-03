import express, { Router, type IRouter, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db, identityVerificationsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import {
  IdentityError,
  applyDecision,
  applyEvent,
  recordDelivery,
  listingsVisible,
  refreshLatest,
  startVerification,
  toDecision,
  verificationDueBy,
  veriffConfigured,
  webhookSignatureValid,
} from "../lib/identity";

// Seller identity verification (see lib/identity.ts).
const router: IRouter = Router();

/** The caller's verification state for the seller dashboard. */
async function summary(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;
  const [latest] = await db
    .select()
    .from(identityVerificationsTable)
    .where(eq(identityVerificationsTable.userId, userId))
    .orderBy(desc(identityVerificationsTable.createdAt))
    .limit(1);
  const dueBy = verificationDueBy(user);
  return {
    required: user.role === "seller",
    status: user.identityStatus,
    verifiedAt: user.identityVerifiedAt?.toISOString() ?? null,
    listingsVisible: listingsVisible(user),
    dueBy: dueBy?.toISOString() ?? null,
    available: veriffConfigured(),
    // Veriff's reason is shown when the seller has something to fix.
    session: latest
      ? {
          status: latest.status,
          reason: ["resubmission_requested", "declined"].includes(latest.status) ? latest.reason : null,
          createdAt: latest.createdAt.toISOString(),
        }
      : null,
  };
}

function sendError(res: Response, error: unknown) {
  if (!(error instanceof IdentityError)) throw error;
  res.status(error.status).json({ error: error.message });
}

router.get("/identity", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await summary(req.auth!.userId));
});

// Starts the seller's identity check (or reopens an unfinished one).
router.post("/identity/session", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.status(201).json(await startVerification(req.auth!.userId));
  } catch (error) {
    sendError(res, error);
  }
});

// On return from Veriff: asks for the decision in case the webhook is late.
router.post("/identity/refresh", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await refreshLatest(req.auth!.userId);
  } catch (error) {
    // The webhook still delivers the result; report the current state.
    if (!(error instanceof IdentityError)) throw error;
  }
  res.json(await summary(req.auth!.userId));
});

export default router;

// ── Veriff webhooks ──────────────────────────────────────────────────────────
// Server-to-server: mounted before the JSON parser and the browser-origin
// check, authenticated by the HMAC signature over the raw body. Veriff retries
// until it gets a 200 within 5 seconds, delivers at least once and may deliver
// out of order; applyDecision ignores anything older than what is stored.
export const identityWebhooks: IRouter = Router();
identityWebhooks.use(express.raw({ type: "*/*", limit: "1mb" }));

identityWebhooks.post("/veriff", async (req, res) => {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !webhookSignatureValid(raw, req.get("x-hmac-signature"), req.get("x-auth-client"))) {
    res.status(401).json({ error: "Invalid signature." });
    return;
  }
  let body: {
    verification?: Parameters<typeof toDecision>[0];
    id?: string;
    action?: string;
  };
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    res.sendStatus(400);
    return;
  }
  const sessionId = body.verification?.id ?? body.id ?? null;
  // Repeats are harmless (both handlers are idempotent), so a delivery is only
  // recorded once processed: a failure returns 500 and Veriff retries it.
  // Decision webhook: { verification: {...} }. Event webhook: { id, action }.
  const decision = toDecision(body.verification);
  if (decision) {
    const outcome = await applyDecision(decision);
    if (outcome === "unknown") logger.warn({ provider: "veriff" }, "Identity decision for an unknown session");
  } else if (body.id && body.action) {
    await applyEvent(body.id, body.action);
  }
  await recordDelivery(raw, sessionId);
  res.sendStatus(200);
});
