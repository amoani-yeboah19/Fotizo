import type { Request, Response, NextFunction } from "express";
import { resolveSession } from "../lib/sessions";
import { AUTH_COOKIE_NAME } from "../lib/cookies";

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string; role: string; sessionId: string };
}
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  const auth = typeof token === "string" ? await resolveSession(token) : null;
  if (!auth) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }
  req.auth = auth;
  res.setHeader("Cache-Control", "no-store");
  next();
}
