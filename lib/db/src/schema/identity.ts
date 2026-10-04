import { pgTable, uuid, text, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Seller identity verification through Veriff (migrations/0017). Only the
// decision and the document's type and country are kept here; images,
// document numbers and personal details stay with Veriff.
export const VERIFICATION_SESSION_STATUSES = [
  "created",
  "started",
  "submitted",
  "approved",
  "declined",
  "resubmission_requested",
  "expired",
  "abandoned",
  "review",
] as const;
export type VerificationSessionStatus = (typeof VERIFICATION_SESSION_STATUSES)[number];

export const identityVerificationsTable = pgTable("identity_verifications", {
  /** Sent to Veriff as vendorData, so webhooks map back without personal data. */
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("veriff"),
  sessionId: text("session_id").notNull(),
  sessionUrl: text("session_url").notNull(),
  status: text("status").$type<VerificationSessionStatus>().notNull().default("created"),
  decisionCode: integer("decision_code"),
  reason: text("reason"),
  reasonCode: integer("reason_code"),
  documentType: text("document_type"),
  documentCountry: text("document_country"),
  /** Whether the name on the document matched the account name. */
  nameMatches: boolean("name_matches"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

/** Webhook deliveries already processed, keyed by a hash of the body. */
export const identityWebhookEventsTable = pgTable(
  "identity_webhook_events",
  {
    provider: text("provider").notNull(),
    eventHash: text("event_hash").notNull(),
    sessionId: text("session_id"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventHash] })],
);

export type IdentityVerificationRow = typeof identityVerificationsTable.$inferSelect;
