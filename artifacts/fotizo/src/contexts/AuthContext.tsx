import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService } from "@/services";
import type { User, SignupData } from "@/types";

// Re-exported so existing consumers can keep importing these from the context.
export type { User, UserRole, SignupData } from "@/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
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

  const login = async (email: string, password: string) => {
    try {
      const loggedIn = await authService.login(email, password);
      setUser(loggedIn);
      authService.saveSession(loggedIn);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Login failed." };
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const created = await authService.signup(data);
      setUser(created);
      authService.saveSession(created);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Sign up failed." };
    }
  };

  const logout = () => {
    setUser(null);
    authService.clearSession();
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      authService.saveSession(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
