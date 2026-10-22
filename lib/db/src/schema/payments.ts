import { pgTable, uuid, text, bigint, numeric, timestamp, index, primaryKey, boolean } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";
import { usersTable } from "./users";

// Created by migrations/0010_online_payments.sql; constraints live there.
// Historical providers remain readable; new attempts use Payaza (migration 0023).
export const PAYMENT_PROVIDERS = ["paystack", "stripe", "dlocal", "payaza"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type PaymentAttemptStatus = "pending" | "succeeded" | "failed" | "expired";

export const paymentAttemptsTable = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    provider: text("provider").$type<PaymentProvider>().notNull(),
    reference: text("reference").notNull().unique(),
    providerSessionId: text("provider_session_id").unique(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8, mode: "number" }).notNull(),
    status: text("status").$type<PaymentAttemptStatus>().notNull().default("pending"),
    checkoutUrl: text("checkout_url"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("payment_attempts_order_created_idx").on(t.orderId, t.createdAt)],
);

export const paymentEventsTable = pgTable(
  "payment_events",
  {
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventId] })],
);

export type PaymentAttemptRow = typeof paymentAttemptsTable.$inferSelect;

// The national ID a payment provider requires (e.g. the Ghana Card), encrypted
// at rest; documentHint is the last characters, safe to show (migrations/0022).
export const payerIdentitiesTable = pgTable("payer_identities", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  country: text("country").notNull(),
  documentCiphertext: text("document_ciphertext").notNull(),
  documentHint: text("document_hint").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RefundStatus = "pending" | "succeeded" | "failed";
// A manager's refund of order lines (and optionally shipping) back to the buyer.
export const paymentRefundsTable = pgTable(
  "payment_refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "restrict" }),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => paymentAttemptsTable.id, { onDelete: "restrict" }),
    provider: text("provider").$type<"stripe" | "dlocal">().notNull(),
    providerRefundId: text("provider_refund_id").unique(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").$type<RefundStatus>().notNull().default("pending"),
    reason: text("reason").notNull(),
    orderItemIds: uuid("order_item_ids").array().notNull(),
    includesShipping: boolean("includes_shipping").notNull().default(false),
    failureReason: text("failure_reason"),
    requestedBy: uuid("requested_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payment_refunds_order_idx").on(t.orderId, t.createdAt)],
);
export type PaymentRefundRow = typeof paymentRefundsTable.$inferSelect;
