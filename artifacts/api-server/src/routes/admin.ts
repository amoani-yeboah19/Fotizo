import { Router, type IRouter } from "express";
import { z } from "zod";
import { ChangeManagedAccountStatusBody } from "@workspace/api-zod";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, usersTable, accountAuditTable } from "@workspace/db";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middlewares/requireAuth";
import { changeAccountStatus } from "../lib/account-controls";

const router: IRouter = Router();
router.use(requireAuth);
router.use((req: AuthenticatedRequest, res, next) => {
  if (req.auth!.role !== "manager") {
    res.status(403).json({ error: "Manager access is required." });
    return;
  }
  next();
});
const pageSchema = z.coerce.number().int().min(0).max(100_000).default(0);
const listSchema = z
  .object({
    page: pageSchema,
    q: z.string().trim().max(120).default(""),
    status: z.enum(["all", "active", "suspended"]).default("all"),
  })
  .strict();
// The generator omits integer/strict-object checks; enforce them at the boundary.
const statusSchema = ChangeManagedAccountStatusBody.extend({
  reason: ChangeManagedAccountStatusBody.shape.reason.trim().min(10),
  expectedVersion: ChangeManagedAccountStatusBody.shape.expectedVersion.int(),
}).strict();
const customerRoles = ["buyer", "seller"] as const;
const pageSize = 25;

router.get("/accounts", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account filters." });
    return;
  }
  const { page, q, status } = parsed.data;
  // Search text is literal, not a LIKE wildcard supplied by the caller.
  const search = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      suspendedAt: usersTable.suspendedAt,
      statusVersion: usersTable.accountStatusVersion,
    })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.role, [...customerRoles]),
        q
          ? or(ilike(usersTable.name, search), ilike(usersTable.email, search))
          : undefined,
        status === "active"
          ? isNull(usersTable.suspendedAt)
          : status === "suspended"
            ? isNotNull(usersTable.suspendedAt)
            : undefined,
      ),
    )
    .orderBy(desc(usersTable.createdAt), desc(usersTable.id))
    .limit(pageSize + 1)
    .offset(page * pageSize);
  res.json({
    items: rows.slice(0, pageSize),
    page,
    hasMore: rows.length > pageSize,
  });
});

router.get("/accounts/summary", async (_req, res) => {
  const [summary] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${usersTable.suspendedAt} is null)::int`,
      suspended: sql<number>`count(*) filter (where ${usersTable.suspendedAt} is not null)::int`,
    })
    .from(usersTable)
    .where(inArray(usersTable.role, [...customerRoles]));
  res.json(summary);
});

router.post("/accounts/:id/status", async (req: AuthenticatedRequest, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const parsed = statusSchema.safeParse(req.body);
  if (!id.success || !parsed.success) {
    res
      .status(400)
      .json({
        error:
          "Choose a valid account and action, provide a reason of 10-1000 characters, and refresh the account status.",
      });
    return;
  }
  const outcome = await changeAccountStatus(
    req.auth!.userId,
    req.auth!.sessionId,
    id.data,
    parsed.data,
  );
  if (outcome.status !== 200) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }
  res.json(outcome.result);
});

router.get("/account-audit", async (req, res) => {
  const parsed = z
    .object({ page: pageSchema, targetId: z.string().uuid().optional() })
    .strict()
    .safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid audit filters." });
    return;
  }
  const actor = alias(usersTable, "actor");
  const target = alias(usersTable, "target");
  const rows = await db
    .select({
      id: accountAuditTable.id,
      actorId: accountAuditTable.actorId,
      actorName: actor.name,
      targetUserId: accountAuditTable.targetUserId,
      targetName: target.name,
      action: accountAuditTable.action,
      reason: accountAuditTable.reason,
      statusVersion: accountAuditTable.statusVersion,
      createdAt: accountAuditTable.createdAt,
      previousSuspendedAt: accountAuditTable.previousSuspendedAt,
      suspendedAt: accountAuditTable.suspendedAt,
    })
    .from(accountAuditTable)
    .innerJoin(actor, eq(actor.id, accountAuditTable.actorId))
    .innerJoin(target, eq(target.id, accountAuditTable.targetUserId))
    .where(
      parsed.data.targetId
        ? eq(accountAuditTable.targetUserId, parsed.data.targetId)
        : undefined,
    )
    .orderBy(desc(accountAuditTable.createdAt), desc(accountAuditTable.id))
    .limit(pageSize + 1)
    .offset(parsed.data.page * pageSize);
  res.json({
    items: rows.slice(0, pageSize),
    page: parsed.data.page,
    hasMore: rows.length > pageSize,
  });
});
export default router;
