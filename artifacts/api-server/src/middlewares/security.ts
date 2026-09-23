import type { RequestHandler, ErrorRequestHandler } from "express";
import { createHash } from "node:crypto";
import { db, authRateLimitsTable, sessionsTable } from "@workspace/db";
import { lt, sql } from "drizzle-orm";

export function configuredOrigins(): string[] {
  const value =
    process.env.CORS_ORIGIN ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");
  const origins = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          url.origin !== origin || !["http:", "https:"].includes(url.protocol)
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error(
      "CORS_ORIGIN must contain explicit frontend origins, separated by commas.",
    );
  return origins;
}

export function protectBrowserWrites(
  origins: readonly string[],
): RequestHandler {
  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    // Custom headers cannot be supplied by HTML forms. Cross-origin fetches
    // must also pass the explicit Origin check and CORS preflight.
    if (
      req.get("X-Fotizo-Request") !== "1" ||
      (req.get("Origin") && !origins.includes(req.get("Origin")!))
    ) {
      res.status(403).json({ error: "Request origin could not be verified." });
      return;
    }
    next();
  };
}

export async function consumeAuthAttempt(
  identity: string,
  limit = 30,
  now = Date.now(),
) {
  const windowMs = 15 * 60 * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs);
  const key = createHash("sha256")
    .update(`${windowStart}:${identity}`)
    .digest("hex");
  const [row] = await db
    .insert(authRateLimitsTable)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: authRateLimitsTable.key,
      set: { count: sql`${authRateLimitsTable.count} + 1` },
    })
    .returning();
  return {
    allowed: row.count <= limit,
    retryAfter: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
  };
}

let cleanupAfter = 0;
export const limitAuthAttempts: RequestHandler = async (req, res, next) => {
  const path = req.path.toLowerCase().replace(/\/+$/, "");
  if (
    req.method !== "POST" ||
    !["/login", "/register", "/google", "/google/complete"].includes(path)
  )
    return next();
  const now = Date.now();
  if (now > cleanupAfter) {
    cleanupAfter = now + 300_000;
    await db
      .delete(authRateLimitsTable)
      .where(lt(authRateLimitsTable.expiresAt, new Date(now)));
    await db
      .delete(sessionsTable)
      .where(lt(sessionsTable.expiresAt, new Date(now)));
  }
  const result = await consumeAuthAttempt(
    req.ip ?? req.socket.remoteAddress ?? "unknown",
  );
  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfter);
    res
      .status(429)
      .json({ error: "Too many sign-in attempts. Please try again later." });
    return;
  }
  next();
};

export const apiErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Parser errors contain raw request bodies; database errors can contain parameters.
  req.log?.error(
    { errorType: err?.name, code: err?.code ?? err?.cause?.code },
    "API request failed",
  );
  if (res.headersSent) return next(err);
  if (err?.type === "entity.parse.failed")
    return void res.status(400).json({ error: "Invalid JSON body." });
  if (err?.type === "entity.too.large")
    return void res.status(413).json({ error: "Request body is too large." });
  if (err?.code === "23505" || err?.cause?.code === "23505")
    return void res
      .status(409)
      .json({ error: "This record already exists. Refresh and try again." });
  res
    .status(503)
    .json({
      error: "The service is temporarily unavailable. Please try again.",
    });
};
