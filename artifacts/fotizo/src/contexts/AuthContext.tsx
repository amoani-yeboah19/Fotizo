import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { authService } from "@/features/auth/services";
import type { User, SignupData } from "@/types";
export type { User, UserRole, SignupData } from "@/types";

type Result = { success: boolean; error?: string };
type GoogleLoginOutcome =
  | { success: true; needsRole: false }
  | { success: true; needsRole: true; pendingToken: string }
  | { success: false; error: string };
type SessionStatus =
  | "loading"
  | "authenticated"
  | "anonymous"
  | "signing-out"
  | "error";
interface AuthContextType {
  user: User | null;
  status: SessionStatus;
  sessionKey: number;
  sessionError: string | null;
  isAuthenticated: boolean;
  retrySession: () => Promise<void>;
  login: (email: string, password: string) => Promise<Result>;
  signup: (data: SignupData) => Promise<Result>;
  loginWithGoogle: (credential: string) => Promise<GoogleLoginOutcome>;
  completeGoogleSignup: (
    token: string,
    role: "buyer" | "seller",
  ) => Promise<Result>;
  logout: () => Promise<Result>;
}
const AuthContext = createContext<AuthContextType | null>(null);
const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Unable to complete sign in.";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [sessionKey, setSessionKey] = useState(0);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const logoutFailed = useRef(false);
  const mounted = useRef(false);

  const replaceIdentity = useCallback((next: User | null) => {
    setUser(next);
    setSessionKey((key) => key + 1);
    setStatus(next ? "authenticated" : "anonymous");
    setSessionError(null);
    if (next) authService.saveSession(next);
  }, []);

  const restore = useCallback(async () => {
    if (busy.current || logoutFailed.current) return;
    const requestGeneration = ++generation.current;
    setStatus("loading");
    setSessionError(null);
    try {
      const next = await authService.getSession();
      if (mounted.current && generation.current === requestGeneration)
        replaceIdentity(next);
    } catch {
      if (mounted.current && generation.current === requestGeneration) {
        setStatus("error");
        setSessionError("We could not check your session. Please retry.");
      }
    }
  }, [replaceIdentity]);

  useEffect(() => {
    mounted.current = true;
    void restore();
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, [restore]);

  const authenticate = useCallback(
    async (operation: () => Promise<User>): Promise<Result> => {
      if (busy.current || logoutFailed.current)
        return {
          success: false,
          error: "Please finish signing out before signing in again.",
        };
      busy.current = true;
      const requestGeneration = ++generation.current;
      try {
        const next = await operation();
        if (!mounted.current || generation.current !== requestGeneration)
          return {
            success: false,
            error: "Session changed. Please try again.",
          };
        replaceIdentity(next);
        return { success: true };
      } catch (error) {
        if (mounted.current)
          setStatus((current) =>
            current === "loading" ? "anonymous" : current,
          );
        return { success: false, error: errorMessage(error) };
      } finally {
        busy.current = false;
      }
    },
    [replaceIdentity],
  );

  const login = useCallback(
    (email: string, password: string) =>
      authenticate(() => authService.login(email, password)),
    [authenticate],
  );
  const signup = useCallback(
    (data: SignupData) => authenticate(() => authService.signup(data)),
    [authenticate],
  );
  const completeGoogleSignup = useCallback(
    (token: string, role: "buyer" | "seller") =>
      authenticate(() => authService.completeGoogleSignup(token, role)),
    [authenticate],
  );

  const loginWithGoogle = useCallback(
    async (credential: string): Promise<GoogleLoginOutcome> => {
      if (busy.current || logoutFailed.current)
        return {
          success: false,
          error: "Another session change is in progress.",
        };
      busy.current = true;
      const requestGeneration = ++generation.current;
      try {
        const result = await authService.loginWithGoogle(credential);
        if (!mounted.current || generation.current !== requestGeneration)
          return {
            success: false,
            error: "Session changed. Please try again.",
          };
        if (result.kind === "user") {
          replaceIdentity(result.user);
          return { success: true, needsRole: false };
        }
        setStatus(user ? "authenticated" : "anonymous");
        return {
          success: true,
          needsRole: true,
          pendingToken: result.pendingToken,
        };
      } catch (error) {
        if (mounted.current) setStatus(user ? "authenticated" : "anonymous");
        return { success: false, error: errorMessage(error) };
      } finally {
        busy.current = false;
      }
    },
    [replaceIdentity, user],
  );

  const logout = useCallback(async (): Promise<Result> => {
    if (busy.current)
      return {
        success: false,
        error: "Please wait for the current session change to finish.",
      };
    busy.current = true;
    generation.current += 1;
    // Hide private data immediately; do not report success until revocation succeeds.
    replaceIdentity(null);
    setStatus("signing-out");
    try {
      await authService.clearSession();
      logoutFailed.current = false;
      if (mounted.current) setStatus("anonymous");
      return { success: true };
    } catch {
      logoutFailed.current = true;
      if (mounted.current) {
        setStatus("error");
        setSessionError(
          "Sign out could not be completed on the server. Retry before leaving this device.",
        );
      }
      return { success: false, error: "Sign out failed. Please retry." };
    } finally {
      busy.current = false;
    }
  }, [replaceIdentity]);

  const retrySession = useCallback(async () => {
    if (logoutFailed.current) {
      await logout();
    } else {
      await restore();
    }
  }, [logout, restore]);
  const value = useMemo(
    () => ({
      user,
      status,
      sessionKey,
      sessionError,
      isAuthenticated: status === "authenticated" && !!user,
      retrySession,
      login,
      signup,
      loginWithGoogle,
      completeGoogleSignup,
      logout,
    }),
    [
      user,
      status,
      sessionKey,
      sessionError,
      retrySession,
      login,
      signup,
      loginWithGoogle,
      completeGoogleSignup,
      logout,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
