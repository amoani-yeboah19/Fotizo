import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../lib/jwt";
import { AUTH_COOKIE_NAME } from "../lib/cookies";

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string; role: string };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];

  if (typeof token !== "string") {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session." });
  }
}
