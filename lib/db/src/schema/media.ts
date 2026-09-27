import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Created by migrations/0013_media_uploads.sql (avatars added in 0014); constraints live there.
export const MEDIA_PURPOSES = ["product", "service", "avatar"] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export const mediaUploadsTable = pgTable("media_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  purpose: text("purpose").$type<MediaPurpose>().notNull(),
  bucket: text("bucket").notNull(),
  path: text("path").notNull(),
  contentType: text("content_type").$type<ImageType>().notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
