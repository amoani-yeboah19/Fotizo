import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db, usersTable, type UserRow } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  signAuthToken,
  signPendingGoogleSignupToken,
  verifyPendingGoogleSignupToken,
} from "../lib/jwt";
import { verifyGoogleCredential, GoogleNotConfiguredError } from "../lib/googleAuth";
import { AUTH_COOKIE_NAME, authCookieOptions } from "../lib/cookies";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

const signupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
  // Public signup can only ever create buyer/seller accounts — manager and
  // developer are staff roles and must never be self-assignable from a
  // client-supplied field, no matter what the frontend form currently offers.
  role: z.enum(["buyer", "seller"]),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Shape returned to the client — deliberately excludes passwordHash.
function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar ?? undefined,
    joinedAt: row.createdAt.toISOString().split("T")[0],
    verified: row.verified,
  };
}

router.post("/register", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid signup data.", issues: parsed.error.issues });
    return;
  }
  const { name, email, password, role } = parsed.data;

  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, role })
    .returning();

  const token = signAuthToken({ sub: created.id, role: created.role });
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
  res.status(201).json(toPublicUser(created));
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login data." });
    return;
  }
  const { email, password } = parsed.data;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  // Same generic error whether the email doesn't exist, the account is
  // Google-only (no passwordHash), or the password is wrong. Telling those
  // apart would let an attacker enumerate real accounts.
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = signAuthToken({ sub: user.id, role: user.role });
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
  res.json(toPublicUser(user));
});

const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

const googleCompleteSchema = z.object({
  pendingToken: z.string().min(1),
  role: z.enum(["buyer", "seller"]),
});

// Entry point for the "Continue with Google" button. Either logs an existing
// (or newly-linked) account straight in, or — for a brand-new email — defers
// account creation until the client collects a buyer/seller role choice.
router.post("/google", async (req, res) => {
  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid Google sign-in request." });
    return;
  }

  let identity;
  try {
    identity = await verifyGoogleCredential(parsed.data.credential);
  } catch (err) {
    if (err instanceof GoogleNotConfiguredError) {
      res.status(503).json({ error: "Google sign-in isn't set up on this server yet." });
      return;
    }
    res.status(401).json({ error: "Could not verify Google account." });
    return;
  }

  if (!identity.emailVerified) {
    res.status(401).json({ error: "Google account email is not verified." });
    return;
  }

  const email = identity.email.toLowerCase();

  const existing = await db.query.usersTable.findFirst({
    where: or(eq(usersTable.googleId, identity.googleId), eq(usersTable.email, email)),
  });

  if (existing) {
    // Existing password account with the same, Google-verified email — link
    // it rather than creating a duplicate account for the same person.
    const user = existing.googleId
      ? existing
      : (
          await db
            .update(usersTable)
            .set({ googleId: identity.googleId, verified: true })
            .where(eq(usersTable.id, existing.id))
            .returning()
        )[0];

    const token = signAuthToken({ sub: user.id, role: user.role });
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
    res.json({ kind: "user", user: toPublicUser(user) });
    return;
  }

  const pendingToken = signPendingGoogleSignupToken({
    googleId: identity.googleId,
    email,
    name: identity.name,
  });
  res.json({ kind: "pending", pendingToken });
});

// Finishes a brand-new Google signup once the user has picked buyer/seller.
router.post("/google/complete", async (req, res) => {
  const parsed = googleCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request." });
    return;
  }

  let pending;
  try {
    pending = verifyPendingGoogleSignupToken(parsed.data.pendingToken);
  } catch {
    res.status(401).json({
      error: "This sign-up has expired. Please try Continue with Google again.",
    });
    return;
  }

  // Re-check in case the account was created in the gap (e.g. a second tab).
  const existing = await db.query.usersTable.findFirst({
    where: or(eq(usersTable.googleId, pending.googleId), eq(usersTable.email, pending.email)),
  });

  const user = existing
    ? existing.googleId
      ? existing
      : (
          await db
            .update(usersTable)
            .set({ googleId: pending.googleId, verified: true })
            .where(eq(usersTable.id, existing.id))
            .returning()
        )[0]
    : (
        await db
          .insert(usersTable)
          .values({
            name: pending.name,
            email: pending.email,
            googleId: pending.googleId,
            role: parsed.data.role,
            verified: true,
          })
          .returning()
      )[0];

  const token = signAuthToken({ sub: user.id, role: user.role });
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
  res.status(201).json(toPublicUser(user));
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
  res.status(204).end();
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, req.auth!.userId),
  });
  if (!user) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  res.json(toPublicUser(user));
});

export default router;
