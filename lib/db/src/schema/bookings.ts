import { pgTable, uuid, text, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { servicesTable } from "./services";

// Created by migrations/0008_bookings.sql; constraints live there.
export const BOOKING_STATUSES = ["requested", "confirmed", "declined", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookingsTable = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => servicesTable.id, { onDelete: "restrict" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    serviceTitle: text("service_title").notNull(),
    packageName: text("package_name").notNull(),
    packagePrice: numeric("package_price", { precision: 10, scale: 2, mode: "number" }).notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull(),
    notes: text("notes").notNull().default(""),
    status: text("status").$type<BookingStatus>().notNull().default("requested"),
    statusVersion: integer("status_version").notNull().default(0),
    providerNote: text("provider_note").notNull().default(""),
    meetingLink: text("meeting_link"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_buyer_scheduled_idx").on(t.buyerId, t.scheduledFor),
    index("bookings_provider_scheduled_idx").on(t.providerId, t.scheduledFor),
  ],
);
export type BookingRow = typeof bookingsTable.$inferSelect;
