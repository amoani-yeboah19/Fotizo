import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Staff roles are never self-assignable at signup (see routes/auth.ts) — they
// are set server-side. "representative" is the USA regional rep;
// "china_representative" owns the sourcing side and is the account the imported
// shop catalogue is listed under, so it needs to own products like a seller.
export const userRoleEnum = pgEnum("user_role", [
  "buyer",
  "seller",
  "manager",
  "developer",
  "representative",
  "china_representative",
]);

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    // Null for accounts created via Google — they never set a password.
    passwordHash: text("password_hash"),
    // Set once a user links or signs up with Google; unique so one Google
    // account can't attach itself to more than one Fotizo user.
    googleId: text("google_id").unique(),
    role: userRoleEnum("role").notNull().default("buyer"),
    avatar: text("avatar"),
    /** Verified by a Fotizo manager (shown publicly). */
    verified: boolean("verified").notNull().default(false),
    /** Google confirmed the email address (migration 0017). */
    emailVerified: boolean("email_verified").notNull().default(false),
    /** Seller identity verification through Veriff (migration 0017). */
    identityStatus: text("identity_status").$type<IdentityStatus>().notNull().default("none"),
    identityVerifiedAt: timestamp("identity_verified_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    accountStatusVersion: integer("account_status_version")
      .notNull()
      .default(0),
    // First complete profile save (migration 0011).
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("users_role_created_idx").on(t.role, t.createdAt, t.id)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  passwordHash: true,
  verified: true,
  emailVerified: true,
  identityStatus: true,
  identityVerifiedAt: true,
  suspendedAt: true,
  accountStatusVersion: true,
  onboardingCompletedAt: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export const IDENTITY_STATUSES = ["none", "pending", "review", "approved", "declined", "resubmission_requested"] as const;
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];
export type UserRow = typeof usersTable.$inferSelect;
