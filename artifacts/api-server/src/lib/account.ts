import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { hashPassword, verifyPassword } from "./password";

/** Password replacement and revocation either both commit or neither does. */
export async function changeAccountPassword(
  userId: string,
  sessionId: string,
  currentPassword: string,
  newPassword: string,
) {
  const account = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!account?.passwordHash)
    return {
      status: 409,
      error:
        "This account uses Google sign-in. Manage its password with Google.",
    };
  if (!(await verifyPassword(currentPassword, account.passwordHash)))
    return { status: 400, error: "Current password is incorrect." };
  if (await verifyPassword(newPassword, account.passwordHash))
    return { status: 400, error: "Choose a different new password." };
  const passwordHash = await hashPassword(newPassword);
  return db.transaction(async (tx) => {
    // Lock in the same order as session issuance, then recheck the credential and
    // session after expensive hashing. Concurrent changes cannot overwrite a winner.
    const [current] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .for("update");
    if (!current || current.suspendedAt)
      return { status: 401, error: "Please sign in again." };
    if (current.passwordHash !== account.passwordHash)
      return {
        status: 409,
        error:
          "Your password changed during this request. Please sign in again.",
      };
    const [session] = await tx
      .select({ id: sessionsTable.id })
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.id, sessionId),
          eq(sessionsTable.userId, userId),
          gt(sessionsTable.expiresAt, new Date()),
        ),
      );
    if (!session) return { status: 401, error: "Please sign in again." };
    await tx
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, userId));
    await tx.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    return { status: 204 };
  });
}
