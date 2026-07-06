import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "fotizo_token";

const isProduction = process.env.NODE_ENV === "production";

export const authCookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the browser can never read this cookie — blocks XSS token theft.
  secure: isProduction, // HTTPS-only in prod; allowed over plain http in local dev.
  // Frontend (Vercel) and backend (Render) live on different domains in production, so the
  // cookie must be SameSite=None to be sent on cross-site fetch requests; browsers require
  // Secure whenever SameSite=None is used, which matches `secure: isProduction` above.
  // Locally both run on localhost, so "lax" is fine and doesn't need HTTPS.
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — must match the JWT's own expiresIn in jwt.ts.
  path: "/",
};
