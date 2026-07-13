import { pgTable, pgEnum, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const offerStatusEnum = pgEnum("offer_status", ["pending", "accepted", "declined"]);

// A 1:1 conversation between two users about a subject (a product inquiry, a
// service negotiation, ...). Symmetric — participantA/participantB have no
// inherent owner; either can send. The two lastReadAt columns drive per-user
// unread counts without needing a per-recipient read row for every message.
export const conversationsTable = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantAId: uuid("participant_a_id")
    .notNull()
    .references(() => usersTable.id),
  participantBId: uuid("participant_b_id")
    .notNull()
    .references(() => usersTable.id),
  subject: text("subject").notNull(),
  participantALastReadAt: timestamp("participant_a_last_read_at", { withTimezone: true }),
  participantBLastReadAt: timestamp("participant_b_last_read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Bumped on every new message so conversation lists sort by recency.
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One message in a conversation. The three offer_* columns are set together to
// render a "custom offer" card (Fiverr-style); a plain chat message leaves them
// null. offerStatus starts "pending" and only the recipient can accept/decline.
export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversationsTable.id),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => usersTable.id),
  content: text("content").notNull(),
  offerDescription: text("offer_description"),
  offerAmount: numeric("offer_amount", { precision: 10, scale: 2, mode: "number" }),
  offerStatus: offerStatusEnum("offer_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ConversationRow = typeof conversationsTable.$inferSelect;
export type MessageRow = typeof messagesTable.$inferSelect;
