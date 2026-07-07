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

// Short-lived token for the gap between "Google verified this person" and
// "they picked buyer/seller" — nothing is written to the DB until the role
// is chosen, so this carries the verified identity across that one extra step.
const PENDING_GOOGLE_SIGNUP_TTL = "10m";

export interface PendingGoogleSignupPayload {
  purpose: "google-signup";
  googleId: string;
  email: string;
  name: string;
}

export function signPendingGoogleSignupToken(
  payload: Omit<PendingGoogleSignupPayload, "purpose">,
): string {
  return jwt.sign({ ...payload, purpose: "google-signup" }, JWT_SECRET, {
    expiresIn: PENDING_GOOGLE_SIGNUP_TTL,
  });
}

export function verifyPendingGoogleSignupToken(token: string): PendingGoogleSignupPayload {
  const payload = jwt.verify(token, JWT_SECRET);
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { purpose?: unknown }).purpose !== "google-signup"
  ) {
    // Guards against a regular auth token being replayed into this endpoint.
    throw new Error("Not a pending Google signup token.");
  }
  return payload as unknown as PendingGoogleSignupPayload;
}
