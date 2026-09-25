import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const accountAuditTable = pgTable(
  "account_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    action: text("action").$type<"suspend" | "reactivate">().notNull(),
    reason: text("reason").notNull(),
    statusVersion: integer("status_version").notNull(),
    previousSuspendedAt: timestamp("previous_suspended_at", {
      withTimezone: true,
    }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("account_audit_target_version_idx").on(
      t.targetUserId,
      t.statusVersion,
    ),
    index("account_audit_created_idx").on(t.createdAt, t.id),
    check(
      "account_audit_action_valid",
      sql`${t.action} IN ('suspend', 'reactivate')`,
    ),
    check(
      "account_audit_reason_valid",
      sql`char_length(btrim(${t.reason})) BETWEEN 10 AND 1000`,
    ),
  ],
);
