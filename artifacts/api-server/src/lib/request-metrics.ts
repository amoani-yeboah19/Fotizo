import type { Request, RequestHandler } from "express";

// In-process request statistics for the developer console. They cover this
// server process since it started; they reset on restart and are not shared
// between instances. Only the method, matched route pattern, status and
// duration are kept: never query strings, bodies, IDs or user identities.

const HOUR_MS = 60 * 60 * 1000;
const RECENT_LIMIT = 25;

type Recent = {
  method: string;
  route: string;
  status: number;
  durationMs: number;
  at: string;
};

const startedAt = Date.now();
let requests = 0;
let serverErrors = 0;
let totalDurationMs = 0;
const hourly = new Map<number, { requests: number; errors: number }>();
const recent: Recent[] = [];

function routePattern(req: Request): string {
  // A matched route exposes its pattern (":id"), not the concrete value.
  const path = req.route?.path;
  return typeof path === "string" ? `${req.baseUrl}${path}` : "(unmatched)";
}

export const recordRequestMetrics: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const now = Date.now();
    const error = res.statusCode >= 500;
    requests += 1;
    totalDurationMs += durationMs;
    if (error) serverErrors += 1;
    const hour = Math.floor(now / HOUR_MS) * HOUR_MS;
    const bucket = hourly.get(hour) ?? { requests: 0, errors: 0 };
    bucket.requests += 1;
    if (error) bucket.errors += 1;
    hourly.set(hour, bucket);
    for (const key of hourly.keys()) if (key < hour - 23 * HOUR_MS) hourly.delete(key);
    recent.unshift({
      method: req.method,
      route: routePattern(req),
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      at: new Date(now).toISOString(),
    });
    recent.length = Math.min(recent.length, RECENT_LIMIT);
  });
  next();
};

export function requestMetricsSnapshot(now = Date.now()) {
  const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  return {
    startedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: Math.floor((now - startedAt) / 1000),
    requests,
    serverErrors,
    errorRate: requests ? Math.round((serverErrors / requests) * 10_000) / 100 : 0,
    avgLatencyMs: requests ? Math.round(totalDurationMs / requests) : 0,
    hourly: Array.from({ length: 24 }, (_, i) => {
      const hour = currentHour - (23 - i) * HOUR_MS;
      const bucket = hourly.get(hour);
      return {
        hour: new Date(hour).toISOString(),
        requests: bucket?.requests ?? 0,
        errors: bucket?.errors ?? 0,
      };
    }),
    recent: [...recent],
  };
}
