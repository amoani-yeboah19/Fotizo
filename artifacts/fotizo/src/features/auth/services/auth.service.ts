import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { User, SignupData } from "@/types";

const SESSION_KEY = "fotizo_user";

export type GoogleAuthResult =
  | { kind: "user"; user: User }
  | { kind: "pending"; pendingToken: string };

// Mock-mode only: the credential is a real Google ID token (JWT), so its
// payload can be read without verifying the signature just to fake a
// plausible email/name — never do this for a token that grants real access.
function decodeGoogleCredentialUnsafe(credential: string): { email: string; name: string } {
  try {
    const payloadB64 = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadB64));
    return { email: payload.email ?? "", name: payload.name ?? payload.email ?? "New User" };
  } catch {
    return { email: "", name: "New User" };
  }
}

export const authService = {
  async login(email: string, _password: string): Promise<User> {
    if (USE_MOCKS) {
      await delay(600);
      const found = fx.MOCK_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      if (!found) throw new Error("No account found with this email.");
      const { password: _pw, ...user } = found;
      return user;
    }
    return api.post<User>("/auth/login", { email, password: _password });
  },

  async signup(data: SignupData): Promise<User> {
    if (USE_MOCKS) {
      await delay(800);
      const exists = fx.MOCK_USERS.find(
        (u) => u.email.toLowerCase() === data.email.toLowerCase(),
      );
      if (exists) throw new Error("An account with this email already exists.");
      return {
        id: `u${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        joinedAt: new Date().toISOString().split("T")[0],
        verified: false,
      };
    }
    return api.post<User>("/auth/register", data);
  },

  async loginWithGoogle(credential: string): Promise<GoogleAuthResult> {
    if (USE_MOCKS) {
      await delay(500);
      const { email, name } = decodeGoogleCredentialUnsafe(credential);
      const found = fx.MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        const { password: _pw, ...user } = found;
        return { kind: "user", user };
      }
      // No real pending state in mock mode — just smuggle the claims through
      // as the "token" since nothing server-side will ever verify it.
      return { kind: "pending", pendingToken: JSON.stringify({ email, name }) };
    }
    return api.post<GoogleAuthResult>("/auth/google", { credential });
  },

  async completeGoogleSignup(pendingToken: string, role: "buyer" | "seller"): Promise<User> {
    if (USE_MOCKS) {
      await delay(600);
      const { email, name } = JSON.parse(pendingToken) as { email: string; name: string };
      return {
        id: `u${Date.now()}`,
        name,
        email,
        role,
        joinedAt: new Date().toISOString().split("T")[0],
        verified: true,
      };
    }
    return api.post<User>("/auth/google/complete", { pendingToken, role });
  },

  // Session persistence. On mocks this is localStorage; against a real backend the
  // session is a cookie set by the server, so save/clear become no-ops / a logout call.
  async getSession(): Promise<User | null> {
    if (USE_MOCKS) {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      try {
        return JSON.parse(stored) as User;
      } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    }
    try {
      return await api.get<User>("/auth/me");
    } catch {
      return null;
    }
  },

  saveSession(user: User): void {
    if (USE_MOCKS) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    if (USE_MOCKS) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      void api.post("/auth/logout").catch(() => {});
    }
  },
};
