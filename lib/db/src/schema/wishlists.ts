import { pgTable, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";

// Created by migrations/0006_wishlists.sql.
export const wishlistItemsTable = pgTable(
  "wishlist_items",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.productId] }),
    index("wishlist_items_user_created_idx").on(t.userId, t.createdAt),
  ],
);
