import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import {
  db,
  identityVerificationsTable,
  identityWebhookEventsTable,
  usersTable,
  type IdentityStatus,
  type UserRow,
  type VerificationSessionStatus,
} from "@workspace/db";
import { logger } from "./logger";
import { configuredOrigins } from "../middlewares/security";

// Seller identity verification through Veriff. Sellers (product sellers and
// artisans) verify once; their listings are public only once approved, after a
// grace period for accounts that existed before verification was required.
// Only opaque ids go to Veriff (our verification row id as vendorData, the
// user id as endUserId); decisions come back on a signed webhook, with a
// decision lookup as fallback. Configuration is read on each call so tests and
// deployments can change it without a restart.
const env = {
  apiKey: () => process.env.VERIFF_API_KEY ?? "",
  secret: () => process.env.VERIFF_SHARED_SECRET ?? "",
  apiUrl: () => (process.env.VERIFF_API_URL || "https://stationapi.veriff.com").replace(/\/+$/, ""),
  requiredFrom: () => process.env.IDENTITY_REQUIRED_FROM ?? "",
  appUrl: () => (process.env.APP_URL ?? configuredOrigins()[0]).replace(/\/+$/, ""),
};

/** Days existing sellers keep their listings public after verification becomes required. */
export const GRACE_DAYS = 14;
/** Sessions a seller may start in WINDOW_DAYS (each one is billed). */
export const MAX_SESSIONS = 3;
export const WINDOW_DAYS = 30;
/** An unfinished session is reused rather than paying for a new one. */
const REUSE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export class IdentityError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const veriffConfigured = () => Boolean(env.apiKey() && env.secret());

/** When verification is required, or null while it isn't (IDENTITY_REQUIRED_FROM unset). */
export function identityPolicy(): { from: Date; graceEnds: Date } | null {
  const raw = env.requiredFrom();
  if (!raw) return null;
  const from = new Date(raw);
  if (Number.isNaN(from.getTime())) {
    logger.warn("IDENTITY_REQUIRED_FROM is not a date; identity verification is not enforced");
    return null;
  }
  return { from, graceEnds: new Date(from.getTime() + GRACE_DAYS * DAY) };
}

type Owner = Pick<UserRow, "role" | "identityStatus" | "createdAt">;

/** Whether an account's listings may be shown to the public. */
export function listingsVisible(owner: Owner, now = new Date()): boolean {
  if (owner.role !== "seller" || owner.identityStatus === "approved") return true;
  const policy = identityPolicy();
  if (!policy) return true;
  return owner.createdAt < policy.from && now < policy.graceEnds;
}

/** When a seller must be verified by for their listings to stay public (null: no deadline applies). */
export function verificationDueBy(owner: Owner): Date | null {
  if (owner.role !== "seller" || owner.identityStatus === "approved") return null;
  const policy = identityPolicy();
  if (!policy) return null;
  return owner.createdAt < policy.from ? policy.graceEnds : owner.createdAt;
}

/** SQL condition: the listing owner (a user id column) may show listings publicly. */
export function ownerVisible(ownerId: AnyColumn | SQL): SQL {
  const policy = identityPolicy();
  if (!policy) return sql`true`;
  return sql`exists (select 1 from users owner where owner.id = ${ownerId} and (
    owner.role <> 'seller'
    or owner.identity_status = 'approved'
    or (owner.created_at < ${policy.from.toISOString()}::timestamptz and now() < ${policy.graceEnds.toISOString()}::timestamptz)
  ))`;
}

// ── Veriff API ───────────────────────────────────────────────────────────────

const sign = (payload: string | Buffer) => createHmac("sha256", env.secret()).update(payload).digest("hex");

/** Webhooks carry an HMAC-SHA256 (hex) of the raw body made with the shared secret. */
export function webhookSignatureValid(rawBody: Buffer, signature: string | undefined, client: string | undefined) {
  if (!veriffConfigured() || !signature || client !== env.apiKey()) return false;
  const expected = Buffer.from(sign(rawBody), "hex");
  const given = Buffer.from(signature.trim().toLowerCase(), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function veriff<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl()}${path}`, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new IdentityError(502, "The identity check service could not be reached. Please try again shortly.");
  }
  if (!response.ok) {
    logger.warn({ status: response.status, path: path.replace(/[0-9a-f-]{36}/gi, ":id") }, "Veriff request failed");
    throw new IdentityError(502, "The identity check could not be started. Please try again shortly.");
  }
  return (await response.json()) as T;
}

/** Starts (or reuses) a seller's Veriff session and returns the URL to open. */
export async function startVerification(userId: string): Promise<{ url: string }> {
  if (!veriffConfigured()) throw new IdentityError(503, "Identity checks are not available yet. Please try again later.");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "seller") throw new IdentityError(403, "Only seller accounts verify their identity.");
  if (user.identityStatus === "approved") throw new IdentityError(409, "Your identity is already verified.");
  if (user.identityStatus === "review" || user.identityStatus === "declined")
    throw new IdentityError(409, "Your identity check is with our team. Contact support if you need to try again.");

  const [latest] = await db
    .select()
    .from(identityVerificationsTable)
    .where(eq(identityVerificationsTable.userId, userId))
    .orderBy(desc(identityVerificationsTable.createdAt))
    .limit(1);
  // Unfinished sessions are reused: Veriff bills each one.
  if (latest && ["created", "started"].includes(latest.status) && latest.createdAt.getTime() > Date.now() - REUSE_DAYS * DAY)
    return { url: latest.sessionUrl };
  if (latest && latest.status === "submitted")
    throw new IdentityError(409, "Your documents are being checked. We'll update your dashboard when the result is in.");

  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(identityVerificationsTable)
    .where(
      and(
        eq(identityVerificationsTable.userId, userId),
        gte(identityVerificationsTable.createdAt, new Date(Date.now() - WINDOW_DAYS * DAY)),
      ),
    );
  if (recent >= MAX_SESSIONS)
    throw new IdentityError(429, "You've started the maximum number of identity checks for now. Contact support for help.");

  const id = randomUUID();
  const created = await veriff<{ verification?: { id?: string; url?: string } }>("/v1/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-AUTH-CLIENT": env.apiKey() },
    body: JSON.stringify({
      verification: {
        callback: `${env.appUrl()}/dashboard/seller?tab=verification`,
        vendorData: id,
        endUserId: userId,
      },
    }),
  });
  const sessionId = created.verification?.id;
  const url = created.verification?.url;
  if (!sessionId || !url) throw new IdentityError(502, "The identity check could not be started. Please try again shortly.");
  await db.transaction(async (tx) => {
    await tx.insert(identityVerificationsTable).values({ id, userId, sessionId, sessionUrl: url });
    await tx.update(usersTable).set({ identityStatus: "pending" }).where(eq(usersTable.id, userId));
  });
  return { url };
}

// ── Decisions ────────────────────────────────────────────────────────────────

export interface Decision {
  sessionId: string;
  status: VerificationSessionStatus;
  code?: number | null;
  reason?: string | null;
  reasonCode?: number | null;
  decisionTime?: string | null;
  vendorData?: string | null;
  person?: { firstName?: string | null; lastName?: string | null } | null;
  document?: { type?: string | null; country?: string | null } | null;
}

const DECISIONS: VerificationSessionStatus[] = ["approved", "declined", "resubmission_requested", "expired", "abandoned", "review"];

const nameTokens = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 1);

/**
 * The document's first and last name both appear in the account name. Order,
 * accents and case are ignored; a mismatch goes to a manager, not a rejection.
 */
export function namesMatch(accountName: string, person: Decision["person"]): boolean | null {
  const first = nameTokens(person?.firstName ?? "");
  const last = nameTokens(person?.lastName ?? "");
  if (!first.length && !last.length) return null;
  const account = new Set(nameTokens(accountName));
  return (!first.length || first.some((t) => account.has(t))) && (!last.length || last.some((t) => account.has(t)));
}

/** The account status a session decision leads to. */
function accountStatus(status: VerificationSessionStatus, nameMatches: boolean | null): IdentityStatus {
  if (status === "approved") return nameMatches === false ? "review" : "approved";
  if (status === "declined") return "declined";
  if (status === "resubmission_requested") return "resubmission_requested";
  if (status === "review") return "review";
  return "none"; // expired or abandoned: the seller can start again
}

/**
 * Records a Veriff decision. Deliveries can repeat or arrive out of order, so a
 * decision older than the one stored is ignored, and an approval is never
 * replaced by a later expiry. Only the seller's latest session sets their status.
 */
export async function applyDecision(decision: Decision): Promise<"applied" | "stale" | "unknown"> {
  if (!DECISIONS.includes(decision.status)) return "unknown";
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(identityVerificationsTable)
      .where(and(eq(identityVerificationsTable.provider, "veriff"), eq(identityVerificationsTable.sessionId, decision.sessionId)))
      .for("update");
    if (!row || (decision.vendorData && decision.vendorData !== row.id)) return "unknown";
    const decidedAt = decision.decisionTime ? new Date(decision.decisionTime) : new Date();
    if (Number.isNaN(decidedAt.getTime())) return "unknown";
    if (row.decidedAt && decidedAt <= row.decidedAt) return "stale";
    if (row.status === "approved" && (decision.status === "expired" || decision.status === "abandoned")) return "stale";
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, row.userId)).for("update");
    if (!user) return "unknown";
    const nameMatches = decision.person ? namesMatch(user.name, decision.person) : row.nameMatches;
    await tx
      .update(identityVerificationsTable)
      .set({
        status: decision.status,
        decisionCode: decision.code ?? null,
        reason: decision.reason ?? null,
        reasonCode: decision.reasonCode ?? null,
        documentType: decision.document?.type ?? row.documentType,
        documentCountry: decision.document?.country ?? row.documentCountry,
        nameMatches,
        decidedAt,
      })
      .where(eq(identityVerificationsTable.id, row.id));
    const [latest] = await tx
      .select({ id: identityVerificationsTable.id })
      .from(identityVerificationsTable)
      .where(eq(identityVerificationsTable.userId, user.id))
      .orderBy(desc(identityVerificationsTable.createdAt))
      .limit(1);
    if (latest?.id !== row.id) return "applied";
    const status = accountStatus(decision.status, nameMatches);
    await tx
      .update(usersTable)
      .set({ identityStatus: status, identityVerifiedAt: status === "approved" ? decidedAt : null })
      .where(eq(usersTable.id, user.id));
    return "applied";
  });
}

/** Progress events (started, submitted) before the decision arrives. */
export async function applyEvent(sessionId: string, action: string) {
  const next: VerificationSessionStatus | null = action === "started" ? "started" : action === "submitted" ? "submitted" : null;
  if (!next) return;
  await db
    .update(identityVerificationsTable)
    .set({ status: next, ...(next === "submitted" ? { submittedAt: new Date() } : {}) })
    .where(
      and(
        eq(identityVerificationsTable.provider, "veriff"),
        eq(identityVerificationsTable.sessionId, sessionId),
        inArray(identityVerificationsTable.status, next === "started" ? ["created"] : ["created", "started"]),
      ),
    );
}

/** Records a processed webhook delivery; false if it had been seen before. */
export async function recordDelivery(rawBody: Buffer, sessionId: string | null) {
  const eventHash = createHash("sha256").update(rawBody).digest("hex");
  const inserted = await db
    .insert(identityWebhookEventsTable)
    .values({ provider: "veriff", eventHash, sessionId })
    .onConflictDoNothing()
    .returning({ eventHash: identityWebhookEventsTable.eventHash });
  return inserted.length > 0;
}

type VeriffVerification = {
  id?: string;
  status?: VerificationSessionStatus;
  code?: number;
  reason?: string | null;
  reasonCode?: number | null;
  decisionTime?: string | null;
  vendorData?: string | null;
  person?: { firstName?: string | null; lastName?: string | null } | null;
  document?: { type?: string | null; country?: string | null } | null;
};

/** A Veriff decision payload (webhook or lookup) as a Decision. */
export function toDecision(verification: VeriffVerification | null | undefined, sessionId?: string): Decision | null {
  const id = verification?.id ?? sessionId;
  if (!verification?.status || !id) return null;
  return {
    sessionId: id,
    status: verification.status,
    code: verification.code ?? null,
    reason: verification.reason ?? null,
    reasonCode: verification.reasonCode ?? null,
    decisionTime: verification.decisionTime ?? null,
    vendorData: verification.vendorData ?? null,
    person: verification.person ?? null,
    document: verification.document ?? null,
  };
}

/** Fallback when a webhook hasn't arrived: asks Veriff for the latest session's decision. */
export async function refreshLatest(userId: string) {
  if (!veriffConfigured()) return;
  const [latest] = await db
    .select()
    .from(identityVerificationsTable)
    .where(eq(identityVerificationsTable.userId, userId))
    .orderBy(desc(identityVerificationsTable.createdAt))
    .limit(1);
  if (!latest || !["created", "started", "submitted", "review"].includes(latest.status)) return;
  const result = await veriff<{ verification?: VeriffVerification | null }>(
    `/v1/sessions/${encodeURIComponent(latest.sessionId)}/decision`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-AUTH-CLIENT": env.apiKey(),
        "X-HMAC-SIGNATURE": sign(latest.sessionId),
      },
    },
  );
  const decision = toDecision(result.verification, latest.sessionId);
  if (decision) await applyDecision(decision);
}
