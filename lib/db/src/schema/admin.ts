import { pgTable, uuid, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

// Created by migrations/0012_manager_workspace.sql; constraints, indexes and
// the append-only triggers live there.

export type AdminTargetType = "user" | "product" | "service" | "submission" | "dispute";

export const adminAuditTable = pgTable("admin_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").$type<AdminTargetType>().notNull(),
  targetId: uuid("target_id").notNull(),
  targetLabel: text("target_label").notNull(),
  reason: text("reason").notNull(),
  before: jsonb("before").$type<Record<string, unknown>>().notNull().default({}),
  after: jsonb("after").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ListingKind = "product" | "service";
export type ReviewStatus = "pending" | "approved" | "rejected";
/** The listing content a seller submitted for review. */
export interface ListingSnapshot {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
}

export const listingReviewsTable = pgTable("listing_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<ListingKind>().notNull(),
  listingId: uuid("listing_id").notNull(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").$type<ReviewStatus>().notNull().default("pending"),
  version: integer("version").notNull().default(1),
  snapshot: jsonb("snapshot").$type<ListingSnapshot>().notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const listingReviewEventsTable = pgTable("listing_review_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id")
    .notNull()
    .references(() => listingReviewsTable.id, { onDelete: "cascade" }),
  action: text("action").$type<"submitted" | "resubmitted" | "approved" | "rejected">().notNull(),
  actorId: uuid("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(),
  reason: text("reason").notNull(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").$type<ListingSnapshot>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const DISPUTE_CATEGORIES = [
  "not_received",
  "damaged",
  "not_as_described",
  "wrong_item",
  "delivery",
  "other",
] as const;
export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number];
export type DisputeStatus = "open" | "reviewing" | "escalated" | "resolved";

export const disputesTable = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  openedBy: uuid("opened_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").$type<DisputeCategory>().notNull(),
  summary: text("summary").notNull(),
  status: text("status").$type<DisputeStatus>().notNull().default("open"),
  priority: text("priority").$type<"normal" | "high">().notNull().default("normal"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputeStatementsTable = pgTable("dispute_statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id")
    .notNull()
    .references(() => disputesTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  statement: text("statement").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputeEventsTable = pgTable("dispute_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id")
    .notNull()
    .references(() => disputesTable.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  fromStatus: text("from_status").$type<DisputeStatus>(),
  toStatus: text("to_status").$type<DisputeStatus>().notNull(),
  version: integer("version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
