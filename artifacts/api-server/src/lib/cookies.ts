import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "fotizo_token";

export const authCookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the browser can never read this cookie — blocks XSS token theft.
  secure: process.env.NODE_ENV === "production", // HTTPS-only in prod; allowed over plain http in local dev.
  sameSite: "lax", // Sent on normal navigation/same-site requests, blocked on most cross-site ones (CSRF defense).
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — must match the JWT's own expiresIn in jwt.ts.
  path: "/",
};
