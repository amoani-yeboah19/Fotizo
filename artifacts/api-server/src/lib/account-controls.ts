import { and, asc, eq, gt, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  sessionsTable,
  accountAuditTable,
  adminAuditTable,
} from "@workspace/db";

export async function changeAccountStatus(
  actorId: string,
  sessionId: string,
  targetId: string,
  input: {
    action: "suspend" | "reactivate";
    reason: string;
    expectedVersion: number;
  },
) {
  return db.transaction(async (tx) => {
    // Canonical locking prevents two concurrent administrative requests deadlocking.
    // Session issuance/password replacement also lock the account before its sessions.
    const accounts = await tx
      .select()
      .from(usersTable)
      .where(inArray(usersTable.id, [actorId, targetId]))
      .orderBy(asc(usersTable.id))
      .for("update");
    const actor = accounts.find((u) => u.id === actorId);
    if (!actor || actor.suspendedAt || actor.role !== "manager")
      return { status: 403, error: "Manager access is required." };
    const [session] = await tx
      .select({ id: sessionsTable.id })
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.id, sessionId),
          eq(sessionsTable.userId, actorId),
          gt(sessionsTable.expiresAt, new Date()),
        ),
      );
    if (!session) return { status: 401, error: "Please sign in again." };
    const target = accounts.find((u) => u.id === targetId);
    if (!target) return { status: 404, error: "Account not found." };
    if (targetId === actorId || !["buyer", "seller"].includes(target.role))
      return {
        status: 403,
        error: "Staff accounts cannot be changed through this workflow.",
      };
    if (
      target.accountStatusVersion !== input.expectedVersion ||
      Boolean(target.suspendedAt) === (input.action === "suspend")
    ) {
      return {
        status: 409,
        error:
          "This account has changed. Refresh its status before trying again.",
      };
    }
    const suspendedAt = input.action === "suspend" ? new Date() : null;
    const version = target.accountStatusVersion + 1;
    await tx
      .update(usersTable)
      .set({ suspendedAt, accountStatusVersion: version })
      .where(eq(usersTable.id, targetId));
    // Reactivation also clears sessions: an old copied cookie never becomes usable again.
    await tx.delete(sessionsTable).where(eq(sessionsTable.userId, targetId));
    const [audit] = await tx
      .insert(accountAuditTable)
      .values({
        actorId,
        targetUserId: targetId,
        action: input.action,
        reason: input.reason,
        statusVersion: version,
        previousSuspendedAt: target.suspendedAt,
        suspendedAt,
      })
      .returning({ id: accountAuditTable.id });
    await tx.insert(adminAuditTable).values({
      id: audit.id,
      actorId,
      actorName: actor.name,
      action: input.action === "suspend" ? "user.suspend" : "user.reinstate",
      targetType: "user",
      targetId,
      targetLabel: target.name,
      reason: input.reason,
      before: { status: target.suspendedAt ? "suspended" : "active" },
      after: { status: suspendedAt ? "suspended" : "active" },
    });
    return {
      status: 200,
      result: {
        id: targetId,
        suspendedAt: suspendedAt?.toISOString() ?? null,
        statusVersion: version,
        auditId: audit.id,
      },
    };
  });
}
