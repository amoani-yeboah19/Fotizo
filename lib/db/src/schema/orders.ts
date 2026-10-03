import { pgTable, pgEnum, uuid, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
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
  // Supplier confirmation for imported goods (migrations/0016). NULL status:
  // nothing in the order needs confirming.
  confirmationStatus: text("confirmation_status").$type<ConfirmationStatus>(),
  /** Fotizo's message with a quote, or the reason it was declined. */
  confirmationNote: text("confirmation_note"),
  deliveryDaysMin: integer("delivery_days_min"),
  deliveryDaysMax: integer("delivery_days_max"),
  quotedAt: timestamp("quoted_at", { withTimezone: true }),
  quotedBy: uuid("quoted_by").references(() => usersTable.id, { onDelete: "set null" }),
  quoteExpiresAt: timestamp("quote_expires_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export const CONFIRMATION_STATUSES = ["awaiting", "quoted", "accepted", "declined", "withdrawn", "expired"] as const;
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number];
/** Days a confirmed quote stays open for the buyer to accept. */
export const QUOTE_VALID_DAYS = 7;

/**
 * Imported goods are listed at an estimate: their options, final price, the
 * supplier's minimum order and delivery are confirmed with the supplier before
 * the buyer pays.
 */
export function needsSupplierConfirmation(p: {
  channel: string;
  sourcePlatform: string | null;
  sourceProductId: string | null;
}): boolean {
  return p.channel === "shop" && Boolean(p.sourcePlatform && p.sourceProductId);
}

/** Whether an order may be paid and fulfilled (it needs no confirmation, or the buyer accepted). */
export const readyToFulfil = (order: { confirmationStatus: ConfirmationStatus | null }) =>
  order.confirmationStatus === null || order.confirmationStatus === "accepted";

export const PAYMENT_METHODS = ["pay_on_delivery", "mobile_money", "bank_transfer", "paystack", "stripe"] as const;
/**
 * What checkout offers today: pay on delivery, Paystack for Ghana, Stripe
 * internationally. Mobile money and bank transfer remain valid on older orders.
 */
export const CHECKOUT_PAYMENT_METHODS = ["pay_on_delivery", "paystack", "stripe"] as const;
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
  needsConfirmation: boolean("needs_confirmation").notNull().default(false),
  /** What the buyer asked for: colour, size, model and so on. */
  requestedOptions: text("requested_options"),
  /** What Fotizo confirmed with the supplier. */
  confirmedOptions: text("confirmed_options"),
  /** The estimated unit price shown at checkout; price holds the confirmed one. */
  estimatedPrice: numeric("estimated_price", { precision: 10, scale: 2, mode: "number" }),
});

export type OrderRow = typeof ordersTable.$inferSelect;
export type OrderItemRow = typeof orderItemsTable.$inferSelect;
