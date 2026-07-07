import { OAuth2Client } from "google-auth-library";

let cachedClient: { client: OAuth2Client; clientId: string } | null | undefined;

// Read lazily (not at module load) so a missing GOOGLE_CLIENT_ID only disables
// the /auth/google routes instead of crashing the whole server on boot —
// unlike JWT_SECRET/DATABASE_URL, this is an optional feature, not something
// every request depends on.
function getClient(): { client: OAuth2Client; clientId: string } | null {
  if (cachedClient !== undefined) return cachedClient;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  cachedClient = clientId ? { client: new OAuth2Client(clientId), clientId } : null;
  return cachedClient;
}

export class GoogleNotConfiguredError extends Error {
  constructor() {
    super("GOOGLE_CLIENT_ID is not configured on the server.");
  }
}

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

// Verifies the ID token's signature against Google's public keys and that it
// was issued for our client ID — this is what proves the credential actually
// came from Google and wasn't forged by the caller.
export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  const ctx = getClient();
  if (!ctx) {
    throw new GoogleNotConfiguredError();
  }

  const ticket = await ctx.client.verifyIdToken({
    idToken: credential,
    audience: ctx.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Invalid Google credential.");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    emailVerified: payload.email_verified ?? false,
  };
}
