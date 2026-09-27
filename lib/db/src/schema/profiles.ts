import { pgTable, uuid, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Created by migrations/0011_account_profiles.sql; constraints live there.
export const accountProfilesTable = pgTable("account_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  country: text("country").notNull(),
  city: text("city").notNull().default(""),
  language: text("language").notNull(),
  accountType: text("account_type").$type<"individual" | "business">().notNull().default("individual"),
  company: text("company").notNull().default(""),
  purpose: text("purpose").notNull().default(""),
  headline: text("headline").notNull().default(""),
  about: text("about").notNull().default(""),
  skills: text("skills").array().notNull().default([]),
  experience: text("experience").notNull().default(""),
  workMode: text("work_mode").notNull().default(""),
  website: text("website").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const POLICIES = ["terms", "privacy"] as const;
export type Policy = (typeof POLICIES)[number];

export const policyAcceptancesTable = pgTable(
  "policy_acceptances",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    policy: text("policy").$type<Policy>().notNull(),
    policyVersion: text("policy_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.policy, t.policyVersion] })],
);

export type AccountProfileRow = typeof accountProfilesTable.$inferSelect;
