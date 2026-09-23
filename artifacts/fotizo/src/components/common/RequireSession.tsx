import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Loading } from "./QueryStates";
export function RequireSession({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: readonly UserRole[];
}) {
  const { user, status } = useAuth();
  if (status === "loading" || status === "signing-out")
    return <Loading label="Checking your session..." />;
  if (status === "error") return null;
  if (!user) return <Redirect to="/login" />;
  if (roles && !roles.includes(user.role))
    return <Redirect to={`/dashboard/${user.role}`} />;
  return <>{children}</>;
}
