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
  // Checkout fields from migrations/0007_order_checkout.sql. Orders placed
  // before that migration have no reference or delivery snapshot.
  reference: text("reference"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2, mode: "number" }),
  shipping: numeric("shipping", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("GBP"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  paymentMethod: text("payment_method").$type<PaymentMethod>(),
  paymentStatus: text("payment_status").$type<"unpaid" | "paid">().notNull().default("unpaid"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidBy: uuid("paid_by").references(() => usersTable.id, { onDelete: "set null" }),
  idempotencyKey: text("idempotency_key"),
});

export const PAYMENT_METHODS = ["pay_on_delivery", "mobile_money", "bank_transfer", "paystack", "stripe"] as const;
/** Methods settled online through a payment provider before the order is paid. */
export const ONLINE_PAYMENT_METHODS = ["paystack", "stripe"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

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
