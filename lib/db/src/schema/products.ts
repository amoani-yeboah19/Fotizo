import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  real,
  numeric,
  jsonb,
  timestamp,
  index,
  check,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

// "unpublished" is a soft delete — the row is kept (so nothing that later
// references it, e.g. past orders, dangles) but hidden from public reads.
export const productStatusEnum = pgEnum("product_status", [
  "active",
  "unpublished",
]);

// Fixed taxonomy shared across products and services — small and rarely
// changes, so it's a seeded table rather than something sellers can create.
export const categoriesTable = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
});

export const productsTable = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    price: numeric("price", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    originalPrice: numeric("original_price", {
      precision: 10,
      scale: 2,
      mode: "number",
    }),
    rating: real("rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    // Seller's display name is looked up via this FK at query time, never
    // stored redundantly here — otherwise it goes stale if they rename.
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => usersTable.id),
    category: text("category").notNull(),
    channel: text("channel")
      .$type<"marketplace" | "shop">()
      .notNull()
      .default("marketplace"),
    // Data URLs or hosted URLs, first one is the cover — matches how the
    // frontend's photo uploader already downscales images client-side today.
    images: text("images").array().notNull().default([]),
    stockCount: integer("stock_count").notNull().default(0),
    tags: text("tags").array().notNull().default([]),
    specs: jsonb("specs").$type<Record<string, string>>().notNull().default({}),
    status: productStatusEnum("status").notNull().default("active"),
    // Set by staff when they unpublish or reject a listing; the owner cannot clear it.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    moderationHold: boolean("moderation_hold").notNull().default(false),
    // Imported goods (migration 0015): where they came from and what they cost.
    sourcePlatform: text("source_platform"),
    sourceProductId: text("source_product_id"),
    sourceUrl: text("source_url"),
    supplierCurrency: text("supplier_currency"),
    supplierCost: numeric("supplier_cost", { precision: 14, scale: 4, mode: "number" }),
    /** Supplier-currency units per GBP used to price it. */
    supplierRate: numeric("supplier_rate", { precision: 18, scale: 8, mode: "number" }),
    markupPercent: numeric("markup_percent", { precision: 6, scale: 2, mode: "number" }),
    priceBasis: text("price_basis").$type<"quoted" | "recovered">(),
    pricedAt: timestamp("priced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "products_channel_valid",
      sql`${t.channel} IN ('marketplace', 'shop')`,
    ),
    index("products_channel_status_idx").on(t.channel, t.status),
    index("products_seller_idx").on(t.sellerId),
  ],
);

export type ProductRow = typeof productsTable.$inferSelect;
export type CategoryRow = typeof categoriesTable.$inferSelect;
