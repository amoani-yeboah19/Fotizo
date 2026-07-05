import jwt from "jsonwebtoken";

const rawSecret = process.env.JWT_SECRET;

if (!rawSecret) {
  throw new Error("JWT_SECRET must be set.");
}

// Re-bound to its own const so the type is `string` by inference, not by
// narrowing — narrowing from the guard above wouldn't survive into the
// function bodies below (TS doesn't re-check closures at call time).
const JWT_SECRET: string = rawSecret;

// How long a login stays valid before the user has to sign in again.
// Kept relatively short because this token can't be revoked early — there's
// no server-side session store to invalidate. Logout only clears the cookie
// on the browser; a stolen token would still work until it expires.
const TOKEN_TTL = "7d";

export interface AuthTokenPayload {
  sub: string; // user id
  role: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as AuthTokenPayload;
}
