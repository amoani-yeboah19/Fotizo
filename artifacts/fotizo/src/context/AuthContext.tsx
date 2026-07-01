import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "buyer" | "seller" | "manager" | "developer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
  verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "u1",
    name: "Alex Morgan",
    email: "buyer@fotizo.com",
    password: "password",
    role: "buyer",
    avatar: "/images/avatar-1.png",
    joinedAt: "2024-01-15",
    verified: true,
  },
  {
    id: "u2",
    name: "Sarah Jenkins",
    email: "seller@fotizo.com",
    password: "password",
    role: "seller",
    avatar: "/images/avatar-2.png",
    joinedAt: "2023-11-08",
    verified: true,
  },
  {
    id: "u3",
    name: "James Carter",
    email: "manager@fotizo.com",
    password: "password",
    role: "manager",
    avatar: "/images/avatar-3.png",
    joinedAt: "2023-06-01",
    verified: true,
  },
  {
    id: "u4",
    name: "Priya Sharma",
    email: "developer@fotizo.com",
    password: "password",
    role: "developer",
    avatar: "/images/avatar-4.png",
    joinedAt: "2024-03-20",
    verified: true,
  },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("fotizo_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("fotizo_user");
      }
    }
  }, []);

  const login = async (email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 600));
    const found = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { success: false, error: "No account found with this email." };
    const { password: _pw, ...userWithoutPw } = found;
    setUser(userWithoutPw);
    localStorage.setItem("fotizo_user", JSON.stringify(userWithoutPw));
    return { success: true };
  };

  const signup = async (data: SignupData) => {
    await new Promise((r) => setTimeout(r, 800));
    const exists = MOCK_USERS.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) return { success: false, error: "An account with this email already exists." };
    const newUser: User = {
      id: `u${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      joinedAt: new Date().toISOString().split("T")[0],
      verified: false,
    };
    setUser(newUser);
    localStorage.setItem("fotizo_user", JSON.stringify(newUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fotizo_user");
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("fotizo_user", JSON.stringify(updated));
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
