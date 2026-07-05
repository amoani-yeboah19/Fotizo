import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable, type UserRow } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAuthToken } from "../lib/jwt";
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

  // Same generic error whether the email doesn't exist or the password is
  // wrong. Telling those apart would let an attacker enumerate real accounts
  // by trying emails and watching which error comes back.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = signAuthToken({ sub: user.id, role: user.role });
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
  res.json(toPublicUser(user));
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
