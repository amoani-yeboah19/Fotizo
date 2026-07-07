import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { authService } from "@/features/auth/services";
import type { User, SignupData } from "@/types";

// Re-exported so existing consumers can keep importing these from the context.
export type { User, UserRole, SignupData } from "@/types";

type GoogleLoginOutcome =
  | { success: true; needsRole: false }
  | { success: true; needsRole: true; pendingToken: string }
  | { success: false; error: string };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (credential: string) => Promise<GoogleLoginOutcome>;
  completeGoogleSignup: (
    pendingToken: string,
    role: "buyer" | "seller",
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    authService.getSession().then((session) => {
      if (active && session) setUser(session);
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const loggedIn = await authService.login(email, password);
      setUser(loggedIn);
      authService.saveSession(loggedIn);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Login failed." };
    }
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    try {
      const created = await authService.signup(data);
      setUser(created);
      authService.saveSession(created);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Sign up failed." };
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string): Promise<GoogleLoginOutcome> => {
    try {
      const result = await authService.loginWithGoogle(credential);
      if (result.kind === "user") {
        setUser(result.user);
        authService.saveSession(result.user);
        return { success: true, needsRole: false };
      }
      return { success: true, needsRole: true, pendingToken: result.pendingToken };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Google sign-in failed.",
      };
    }
  }, []);

  const completeGoogleSignup = useCallback(async (pendingToken: string, role: "buyer" | "seller") => {
    try {
      const created = await authService.completeGoogleSignup(pendingToken, role);
      setUser(created);
      authService.saveSession(created);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Could not finish creating your account.",
      };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authService.clearSession();
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      authService.saveSession(updated);
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      signup,
      loginWithGoogle,
      completeGoogleSignup,
      logout,
      updateUser,
    }),
    [user, login, signup, loginWithGoogle, completeGoogleSignup, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
