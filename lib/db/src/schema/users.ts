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
    verified: boolean("verified").notNull().default(false),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    accountStatusVersion: integer("account_status_version")
      .notNull()
      .default(0),
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
  suspendedAt: true,
  accountStatusVersion: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserRow = typeof usersTable.$inferSelect;
