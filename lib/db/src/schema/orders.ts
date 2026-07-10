import { pgTable, pgEnum, uuid, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

// The checkout transaction as a whole — one per "place order" click.
export const ordersTable = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => usersTable.id),
  total: numeric("total", { precision: 10, scale: 2, mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per product line. Title/image/seller/price are snapshotted at
// purchase time — deliberately NOT looked up live from the product/seller
// rows, so a later price change, rename, or product deletion can never
// rewrite what a past order actually said at checkout.
export const orderItemsTable = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => ordersTable.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id),
  productTitle: text("product_title").notNull(),
  productImage: text("product_image").notNull(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => usersTable.id),
  seller: text("seller").notNull(),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  quantity: integer("quantity").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  trackingNumber: text("tracking_number"),
});

export type OrderRow = typeof ordersTable.$inferSelect;
export type OrderItemRow = typeof orderItemsTable.$inferSelect;
