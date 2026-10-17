import { pgTable, uuid, text, smallint, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";
import { servicesTable } from "./services";

// Customer reviews of a product or a service (migrations/0021); exactly one
// of productId / serviceId is set. Constraints live in the migration.
export const reviewsTable = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => productsTable.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => servicesTable.id, { onDelete: "cascade" }),
  rating: smallint("rating").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type ReviewRow = typeof reviewsTable.$inferSelect;
