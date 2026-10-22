import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Where a seller is paid (migrations/0022). The wallet or bank account number
// is encrypted; accountHint is its last digits, safe to show.
export type PayoutMethod = "mobile_money" | "bank_transfer";
export const payoutAccountsTable = pgTable("payout_accounts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  country: text("country").notNull(),
  method: text("method").$type<PayoutMethod>().notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  /** Mobile money: MTN, VODAFONE (Telecel), AIRTELTIGO or G-MONEY. */
  walletType: text("wallet_type"),
  /** Bank transfer: the bank's SWIFT code. */
  bankCode: text("bank_code"),
  accountCiphertext: text("account_ciphertext").notNull(),
  accountHint: text("account_hint").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type PayoutAccountRow = typeof payoutAccountsTable.$inferSelect;

export type SellerPayoutStatus = "pending" | "processing" | "paid" | "rejected" | "cancelled" | "on_hold";
// A payout of a seller's earnings in one currency through dLocal.
export const sellerPayoutsTable = pgTable("seller_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  externalId: text("external_id").notNull().unique(),
  providerPayoutId: text("provider_payout_id").unique(),
  /** What was owed, in the currency it was earned in. */
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  /** What was sent, after any conversion. */
  payoutAmount: numeric("payout_amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
  payoutCurrency: text("payout_currency").notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8, mode: "number" }).notNull().default(1),
  status: text("status").$type<SellerPayoutStatus>().notNull().default("pending"),
  statusDetail: text("status_detail"),
  requestedBy: uuid("requested_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type SellerPayoutRow = typeof sellerPayoutsTable.$inferSelect;
