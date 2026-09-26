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
import { ApiError } from "@/api/client";
import type { User, SignupData } from "@/types";
export type { User, UserRole, SignupData } from "@/types";

type Result = { success: boolean; error?: string; user?: User };
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
  updateProfile: (name: string) => Promise<Result>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<Result>;
}
export const SESSION_EVENT_KEY = "fotizo_session_event";
function announceSessionChange() {
  // Only a nonce is stored: never cookies, credentials, or account details.
  try {
    localStorage.setItem(SESSION_EVENT_KEY, crypto.randomUUID());
  } catch {
    /* Storage may be unavailable. */
  }
}
const AuthContext = createContext<AuthContextType | null>(null);
const errorMessage = (err: unknown) => {
  if (
    err instanceof ApiError &&
    err.data &&
    typeof err.data === "object" &&
    "error" in err.data &&
    typeof err.data.error === "string"
  )
    return err.data.error;
  return err instanceof Error
    ? err.message
    : "Unable to complete this request.";
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [sessionKey, setSessionKey] = useState(0);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const externalChangePending = useRef(false);
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

  const finishMutation = useCallback(() => {
    busy.current = false;
    if (externalChangePending.current && mounted.current) {
      externalChangePending.current = false;
      logoutFailed.current = false;
      void restore();
    }
  }, [restore]);

  useEffect(() => {
    const onSessionChange = (event: StorageEvent) => {
      if (event.key !== SESSION_EVENT_KEY || !event.newValue) return;
      generation.current += 1;
      replaceIdentity(null);
      setStatus("loading");
      logoutFailed.current = false;
      if (busy.current) externalChangePending.current = true;
      else void restore();
    };
    window.addEventListener("storage", onSessionChange);
    return () => window.removeEventListener("storage", onSessionChange);
  }, [replaceIdentity, restore]);

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
        announceSessionChange();
        return { success: true, user: next };
      } catch (error) {
        if (mounted.current && generation.current === requestGeneration)
          setStatus((current) =>
            current === "loading" ? "anonymous" : current,
          );
        return { success: false, error: errorMessage(error) };
      } finally {
        finishMutation();
      }
    },
    [replaceIdentity, finishMutation],
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
          announceSessionChange();
          return { success: true, needsRole: false };
        }
        setStatus(user ? "authenticated" : "anonymous");
        return {
          success: true,
          needsRole: true,
          pendingToken: result.pendingToken,
        };
      } catch (error) {
        if (mounted.current && generation.current === requestGeneration)
          setStatus(user ? "authenticated" : "anonymous");
        return { success: false, error: errorMessage(error) };
      } finally {
        finishMutation();
      }
    },
    [replaceIdentity, user, finishMutation],
  );

  const logout = useCallback(async (): Promise<Result> => {
    if (busy.current)
      return {
        success: false,
        error: "Please wait for the current session change to finish.",
      };
    busy.current = true;
    const requestGeneration = ++generation.current;
    // Hide private data immediately; do not report success until revocation succeeds.
    replaceIdentity(null);
    setStatus("signing-out");
    try {
      await authService.clearSession();
      announceSessionChange();
      if (generation.current !== requestGeneration)
        return {
          success: false,
          error: "Session changed in another tab. Checking your session.",
        };
      logoutFailed.current = false;
      if (mounted.current) setStatus("anonymous");
      return { success: true };
    } catch {
      if (generation.current !== requestGeneration)
        return {
          success: false,
          error: "Session changed in another tab. Checking your session.",
        };
      logoutFailed.current = true;
      if (mounted.current) {
        setStatus("error");
        setSessionError(
          "Sign out could not be completed on the server. Retry before leaving this device.",
        );
      }
      return { success: false, error: "Sign out failed. Please retry." };
    } finally {
      finishMutation();
    }
  }, [replaceIdentity, finishMutation]);

  const updateProfile = useCallback(
    async (name: string): Promise<Result> => {
      if (busy.current || logoutFailed.current || !user)
        return {
          success: false,
          error: "Please wait for the current session change to finish.",
        };
      busy.current = true;
      const requestGeneration = ++generation.current;
      try {
        const next = await authService.updateProfile(name);
        if (
          !mounted.current ||
          generation.current !== requestGeneration ||
          next.id !== user.id
        )
          return {
            success: false,
            error: "Session changed. Please try again.",
          };
        // A rename must not discard the customer's cart or remount their form.
        setUser(next);
        authService.saveSession(next);
        return { success: true };
      } catch (error) {
        return { success: false, error: errorMessage(error) };
      } finally {
        finishMutation();
      }
    },
    [user, finishMutation],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<Result> => {
      if (busy.current || logoutFailed.current || !user)
        return {
          success: false,
          error: "Please wait for the current session change to finish.",
        };
      busy.current = true;
      const requestGeneration = ++generation.current;
      try {
        await authService.changePassword(currentPassword, newPassword);
        if (!mounted.current || generation.current !== requestGeneration)
          return {
            success: false,
            error: "Session changed. Please sign in again.",
          };
        replaceIdentity(null);
        announceSessionChange();
        return { success: true };
      } catch (error) {
        if (!mounted.current || generation.current !== requestGeneration)
          return {
            success: false,
            error: "Session changed. Please sign in again.",
          };
        // A lost response may follow a committed change. Hide private data until the
        // server session is checked; do not assume the old password still works.
        if (!(error instanceof ApiError) || error.status >= 500) {
          announceSessionChange();
          replaceIdentity(null);
          setStatus("error");
          setSessionError(
            "The password-change result could not be confirmed. Retry the session check, then sign in with your new password if needed.",
          );
        } else if (error.status === 401) replaceIdentity(null);
        return {
          success: false,
          error:
            error instanceof ApiError
              ? errorMessage(error)
              : "The result could not be confirmed. Try signing in with your new password before retrying.",
        };
      } finally {
        finishMutation();
      }
    },
    [replaceIdentity, user, finishMutation],
  );

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
      updateProfile,
      changePassword,
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
      updateProfile,
      changePassword,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
