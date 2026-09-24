import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Tables created by migrations/0004_operations.sql; constraints live there.

export const SUPPORT_TOPICS = [
  "not-received",
  "damaged",
  "refund",
  "vehicle",
  "service",
  "account",
  "other",
] as const;
export const SUPPORT_STATUSES = ["open", "in_progress", "resolved"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const supportRequestsTable = pgTable(
  "support_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    topic: text("topic").$type<(typeof SUPPORT_TOPICS)[number]>().notNull(),
    orderRef: text("order_ref").notNull().default(""),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    message: text("message").notNull(),
    status: text("status").$type<SupportStatus>().notNull().default("open"),
    statusVersion: integer("status_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("support_requests_status_created_idx").on(
      t.status,
      t.createdAt,
      t.id,
    ),
  ],
);

export const VEHICLE_BODY_TYPES = ["suv", "coupe-suv", "sedan", "pickup"] as const;
export const VEHICLE_FUELS = ["petrol", "hybrid", "electric"] as const;

export const vehiclesTable = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    bodyType: text("body_type")
      .$type<(typeof VEHICLE_BODY_TYPES)[number]>()
      .notNull(),
    fuel: text("fuel").$type<(typeof VEHICLE_FUELS)[number]>().notNull(),
    seats: integer("seats").notNull(),
    transmission: text("transmission").notNull(),
    drivetrain: text("drivetrain").notNull(),
    powertrain: text("powertrain").notNull(),
    efficiency: text("efficiency").notNull(),
    landedPrice: numeric("landed_price", {
      precision: 12,
      scale: 2,
      mode: "number",
    }).notNull(),
    leadTimeMinWeeks: integer("lead_time_min_weeks").notNull(),
    leadTimeMaxWeeks: integer("lead_time_max_weeks").notNull(),
    images: text("images").array().notNull().default([]),
    highlights: text("highlights").array().notNull().default([]),
    description: text("description").notNull(),
    status: text("status")
      .$type<"active" | "unpublished">()
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vehicles_status_price_idx").on(t.status, t.landedPrice)],
);

export const ENQUIRY_STATUSES = ["new", "contacted", "quoted", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const vehicleEnquiriesTable = pgTable(
  "vehicle_enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "restrict" }),
    vehicleName: text("vehicle_name").notNull(),
    quotedLandedPrice: numeric("quoted_landed_price", {
      precision: 12,
      scale: 2,
      mode: "number",
    }).notNull(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    destination: text("destination").notNull(),
    message: text("message").notNull().default(""),
    status: text("status").$type<EnquiryStatus>().notNull().default("new"),
    statusVersion: integer("status_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("vehicle_enquiries_status_created_idx").on(
      t.status,
      t.createdAt,
      t.id,
    ),
  ],
);

export const caseEventsTable = pgTable(
  "case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseType: text("case_type").$type<"support" | "vehicle_enquiry">().notNull(),
    caseId: uuid("case_id").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    note: text("note").notNull().default(""),
    statusVersion: integer("status_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("case_events_case_version_idx").on(
      t.caseType,
      t.caseId,
      t.statusVersion,
    ),
    index("case_events_created_idx").on(t.caseType, t.caseId, t.createdAt),
  ],
);

export type SupportRequestRow = typeof supportRequestsTable.$inferSelect;
export type VehicleRow = typeof vehiclesTable.$inferSelect;
export type VehicleEnquiryRow = typeof vehicleEnquiriesTable.$inferSelect;
