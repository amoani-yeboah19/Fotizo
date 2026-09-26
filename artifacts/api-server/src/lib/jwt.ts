import jwt from "jsonwebtoken";
import { z } from "zod";

const secret = process.env.JWT_SECRET;
if (
  !secret ||
  (process.env.NODE_ENV === "production" && Buffer.byteLength(secret) < 32)
) {
  throw new Error("JWT_SECRET must be set (at least 32 bytes in production).");
}
const JWT_SECRET: string = secret;
const issuer = "fotizo-api";
const audience = "fotizo-web";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const roles = z.enum([
  "buyer",
  "seller",
  "manager",
  "developer",
  "representative",
  "china_representative",
]);
const authClaims = z.object({
  purpose: z.literal("session"),
  sub: z.string().uuid(),
  sid: z.string().uuid(),
  role: roles,
  exp: z.number().int(),
  iat: z.number().int(),
});
const pendingClaims = z.object({
  purpose: z.literal("google-signup"),
  googleId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  exp: z.number().int(),
  iat: z.number().int(),
});
export type AuthTokenPayload = z.infer<typeof authClaims>;
export type PendingGoogleSignupPayload = z.infer<typeof pendingClaims>;

function verify(token: string) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
    issuer,
    audience,
  });
}
export function signAuthToken(
  payload: Pick<AuthTokenPayload, "sub" | "sid" | "role">,
): string {
  return jwt.sign({ ...payload, purpose: "session" }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: SESSION_TTL_MS / 1000,
    issuer,
    audience,
  });
}
export function verifyAuthToken(token: string): AuthTokenPayload {
  return authClaims.parse(verify(token));
}
export function signPendingGoogleSignupToken(
  payload: Pick<PendingGoogleSignupPayload, "googleId" | "email" | "name">,
): string {
  return jwt.sign({ ...payload, purpose: "google-signup" }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "10m",
    issuer,
    audience,
  });
}
export function verifyPendingGoogleSignupToken(
  token: string,
): PendingGoogleSignupPayload {
  return pendingClaims.parse(verify(token));
}
