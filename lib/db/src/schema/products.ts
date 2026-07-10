import { pgTable, pgEnum, uuid, text, integer, real, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// "unpublished" is a soft delete — the row is kept (so nothing that later
// references it, e.g. past orders, dangles) but hidden from public reads.
export const productStatusEnum = pgEnum("product_status", ["active", "unpublished"]);

// Fixed taxonomy shared across products and services — small and rarely
// changes, so it's a seeded table rather than something sellers can create.
export const categoriesTable = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
});

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2, mode: "number" }),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  // Seller's display name is looked up via this FK at query time, never
  // stored redundantly here — otherwise it goes stale if they rename.
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => usersTable.id),
  category: text("category").notNull(),
  // Data URLs or hosted URLs, first one is the cover — matches how the
  // frontend's photo uploader already downscales images client-side today.
  images: text("images").array().notNull().default([]),
  stockCount: integer("stock_count").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  specs: jsonb("specs").$type<Record<string, string>>().notNull().default({}),
  status: productStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductRow = typeof productsTable.$inferSelect;
export type CategoryRow = typeof categoriesTable.$inferSelect;
