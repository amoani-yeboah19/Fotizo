import type { Request } from "express";
import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import {
  db,
  caseEventsTable,
  supportRequestsTable,
  vehicleEnquiriesTable,
  usersTable,
  type SupportStatus,
  type EnquiryStatus,
} from "@workspace/db";
import { AUTH_COOKIE_NAME } from "./cookies";
import { resolveSession } from "./sessions";

// Unambiguous characters only: customers read references aloud over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function caseReference(prefix: string): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${out}`;
}

/** The signed-in user, when there is one; public forms work without a session. */
export async function optionalUserId(req: Request): Promise<string | null> {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string") return null;
  return (await resolveSession(token))?.userId ?? null;
}

export const SUPPORT_TRANSITIONS: Record<SupportStatus, SupportStatus[]> = {
  open: ["in_progress", "resolved"],
  in_progress: ["open", "resolved"],
  resolved: ["open"],
};
export const ENQUIRY_TRANSITIONS: Record<EnquiryStatus, EnquiryStatus[]> = {
  new: ["contacted", "quoted", "closed"],
  contacted: ["quoted", "closed"],
  quoted: ["contacted", "closed"],
  closed: ["contacted"],
};

export type CaseType = "support" | "vehicle_enquiry";
type Change = { status: string; expectedVersion: number; note: string };
type Outcome =
  | { status: 200; result: { id: string; status: string; statusVersion: number } }
  | { status: 400 | 404 | 409; error: string };

/**
 * Moves a case to a new status. The row lock, version check, update and history
 * record share one transaction, so two staff members acting on a stale view
 * cannot silently overwrite each other.
 */
export async function changeCaseStatus(
  type: CaseType,
  caseId: string,
  actorId: string,
  change: Change,
): Promise<Outcome> {
  const table =
    type === "support" ? supportRequestsTable : vehicleEnquiriesTable;
  const transitions: Record<string, string[]> =
    type === "support" ? SUPPORT_TRANSITIONS : ENQUIRY_TRANSITIONS;
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: table.status, statusVersion: table.statusVersion })
      .from(table)
      .where(eq(table.id, caseId))
      .for("update");
    if (!current) return { status: 404, error: "Case not found." };
    if (current.statusVersion !== change.expectedVersion)
      return {
        status: 409,
        error: "This case changed since you loaded it. Refresh and try again.",
      };
    if (!transitions[current.status]?.includes(change.status))
      return {
        status: 400,
        error: `A case that is ${current.status.replace("_", " ")} cannot move to ${change.status.replace("_", " ")}.`,
      };
    const statusVersion = current.statusVersion + 1;
    await tx
      .update(table)
      .set({ status: change.status as never, statusVersion, updatedAt: new Date() })
      .where(eq(table.id, caseId));
    await tx.insert(caseEventsTable).values({
      caseType: type,
      caseId,
      actorId,
      fromStatus: current.status,
      toStatus: change.status,
      note: change.note,
      statusVersion,
    });
    return {
      status: 200,
      result: { id: caseId, status: change.status, statusVersion },
    };
  });
}

export async function listCaseEvents(type: CaseType, caseId: string) {
  return db
    .select({
      id: caseEventsTable.id,
      actorName: usersTable.name,
      fromStatus: caseEventsTable.fromStatus,
      toStatus: caseEventsTable.toStatus,
      note: caseEventsTable.note,
      createdAt: caseEventsTable.createdAt,
    })
    .from(caseEventsTable)
    .innerJoin(usersTable, eq(usersTable.id, caseEventsTable.actorId))
    .where(
      and(eq(caseEventsTable.caseType, type), eq(caseEventsTable.caseId, caseId)),
    )
    .orderBy(asc(caseEventsTable.createdAt), asc(caseEventsTable.statusVersion));
}
