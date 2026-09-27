import { pgTable, uuid, text, bigint, numeric, timestamp, index, primaryKey } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

// Created by migrations/0010_online_payments.sql; constraints live there.
export const PAYMENT_PROVIDERS = ["paystack", "stripe"] as const;
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
