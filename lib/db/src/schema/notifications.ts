import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { orderItemsTable } from "./orders";

// A browser or phone that allowed Fotizo notifications (Web Push). The keys
// come from the browser and are needed to encrypt each message to it.
export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A buyer's urgent alert on an overdue order line (migrations/0020).
export const urgentAlertsTable = pgTable("urgent_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderItemId: uuid("order_item_id")
    .notNull()
    .references(() => orderItemsTable.id, { onDelete: "cascade" }),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  pushSent: integer("push_sent").notNull().default(0),
  emailSent: integer("email_sent").notNull().default(0),
});

/** Days after the order (or quote acceptance) a delivery is due when no supplier window applies. */
export const DEFAULT_DELIVERY_DAYS = 7;
/** How long a buyer waits between urgent alerts on one order line. */
export const URGENT_ALERT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * When an order line is due: Fotizo Shop lines with an accepted quote are due
 * the quote's longest delivery estimate after acceptance; everything else
 * DEFAULT_DELIVERY_DAYS after the order was placed.
 */
export function deliveryDueAt(
  line: { needsConfirmation: boolean },
  order: { createdAt: Date; acceptedAt: Date | null; deliveryDaysMax: number | null },
): Date {
  const day = 24 * 60 * 60 * 1000;
  if (line.needsConfirmation && order.acceptedAt && order.deliveryDaysMax)
    return new Date(order.acceptedAt.getTime() + order.deliveryDaysMax * day);
  return new Date(order.createdAt.getTime() + DEFAULT_DELIVERY_DAYS * day);
}
