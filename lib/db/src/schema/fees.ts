import { pgTable, uuid, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { bookingsTable } from "./bookings";
import { ordersTable, orderItemsTable } from "./orders";

// Created by migrations/0015_pricing_and_fees.sql; constraints and the
// one-fee-per-booking / one-fee-per-order-line indexes live there.
export type FeeKind = "booking" | "unit_sale";
export type FeeStatus = "pending" | "collected" | "waived" | "reversed";
export type FeeCurrency = "GHS" | "USD" | "GBP" | "EUR";

export const platformFeesTable = pgTable("platform_fees", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<FeeKind>().notNull(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  bookingId: uuid("booking_id").references(() => bookingsTable.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").references(() => ordersTable.id, { onDelete: "restrict" }),
  orderItemId: uuid("order_item_id").references(() => orderItemsTable.id, { onDelete: "restrict" }),
  reference: text("reference").notNull(),
  currency: text("currency").$type<FeeCurrency>().notNull(),
  quantity: integer("quantity").notNull().default(1),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  status: text("status").$type<FeeStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformFeeRow = typeof platformFeesTable.$inferSelect;
