import { pgTable, uuid, integer, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";

// Created by migrations/0009_carts.sql.
export const cartItemsTable = pgTable(
  "cart_items",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.productId] }),
    index("cart_items_user_added_idx").on(t.userId, t.addedAt),
  ],
);
