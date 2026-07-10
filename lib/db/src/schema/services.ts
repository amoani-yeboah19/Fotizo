import { pgTable, pgEnum, uuid, text, integer, real, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// "unpublished" is a soft delete, same reasoning as products: keep the row so
// nothing that later references it (e.g. a booking) dangles.
export const serviceStatusEnum = pgEnum("service_status", ["active", "unpublished"]);

export const servicesTable = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  // Provider's display name/avatar are looked up via this FK at query time,
  // never stored redundantly here — otherwise they go stale if renamed.
  providerId: uuid("provider_id")
    .notNull()
    .references(() => usersTable.id),
  // Photo for this listing — set at creation from the user's account avatar
  // but editable independently afterwards, so it's stored on the row rather
  // than looked up live from the user.
  avatar: text("avatar").notNull(),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  experience: text("experience").notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2, mode: "number" }).notNull(),
  category: text("category").notNull(),
  availability: text("availability").notNull(),
  packages: jsonb("packages")
    .$type<{ name: string; price: number; delivery: string; description: string }[]>()
    .notNull()
    .default([]),
  skills: text("skills").array().notNull().default([]),
  status: serviceStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceRow = typeof servicesTable.$inferSelect;
