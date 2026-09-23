import type { Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, type UserRow } from "@workspace/db";
import { SESSION_TTL_MS, signAuthToken, verifyAuthToken } from "./jwt";
import { AUTH_COOKIE_NAME, authCookieOptions } from "./cookies";

export async function issueSession(
  res: Response,
  user: UserRow,
): Promise<boolean> {
  if (user.suspendedAt) {
    res
      .status(403)
      .json({ error: "This account is suspended. Contact support." });
    return false;
  }
  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    })
    .returning();
  res.cookie(
    AUTH_COOKIE_NAME,
    signAuthToken({ sub: user.id, sid: session.id, role: user.role }),
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
