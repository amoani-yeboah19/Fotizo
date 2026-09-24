import type { Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, type UserRow } from "@workspace/db";
import { SESSION_TTL_MS, signAuthToken, verifyAuthToken } from "./jwt";
import { AUTH_COOKIE_NAME, authCookieOptions } from "./cookies";

export async function issueSession(
  res: Response,
  user: UserRow,
): Promise<boolean> {
  // Serialize issuance with password changes. A login that verified an old hash
  // must not create a fresh session after that password has been replaced.
  const result = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .for("update");
    if (!current || current.passwordHash !== user.passwordHash)
      return { error: 401 as const };
    if (current.suspendedAt) return { error: 403 as const };
    const [session] = await tx
      .insert(sessionsTable)
      .values({
        userId: current.id,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      })
      .returning();
    return { session, role: current.role };
  });
  if (result.error) {
    res
      .status(result.error)
      .json({
        error:
          result.error === 403
            ? "This account is suspended. Contact support."
            : "Account credentials changed. Please sign in again.",
      });
    return false;
  }
  const { session } = result;
  res.cookie(
    AUTH_COOKIE_NAME,
    signAuthToken({ sub: user.id, sid: session.id, role: result.role }),
    authCookieOptions,
  );
  return true;
}

export async function resolveSession(token: string) {
  let claims;
  try {
    claims = verifyAuthToken(token);
  } catch {
    return null;
  }
  const [row] = await db
    .select({ session: sessionsTable, user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.id, claims.sid),
        eq(sessionsTable.userId, claims.sub),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    );
  if (!row || row.user.suspendedAt) return null;
  return {
    userId: row.user.id,
    role: row.user.role,
    sessionId: row.session.id,
  };
}

export async function revokeSession(token: unknown): Promise<void> {
  if (typeof token !== "string") return;
  let claims;
  try {
    claims = verifyAuthToken(token);
  } catch {
    return;
  }
  await db
    .delete(sessionsTable)
    .where(
      and(
        eq(sessionsTable.id, claims.sid),
        eq(sessionsTable.userId, claims.sub),
      ),
    );
}
