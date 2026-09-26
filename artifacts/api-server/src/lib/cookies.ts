import type { CookieOptions } from "express";
import { SESSION_TTL_MS } from "./jwt";
export const AUTH_COOKIE_NAME = "fotizo_token";
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // Production uses the same-origin frontend proxy.
  sameSite: "lax",
  maxAge: SESSION_TTL_MS,
  path: "/",
};
