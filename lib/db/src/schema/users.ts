import { pgTable, pgEnum, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", [
  "buyer",
  "seller",
  "manager",
  "developer",
]);

export const usersTable = pgTable("users", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  passwordHash: true,
  verified: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserRow = typeof usersTable.$inferSelect;
