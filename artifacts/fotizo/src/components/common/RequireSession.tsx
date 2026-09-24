import { useEffect, type ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { Loading } from "./QueryStates";
export function RequireSession({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: readonly UserRole[];
}) {
  const { user, status } = useAuth();
  const [location] = useLocation();
  const openAuth = useAuthModal();
  const signedOut = status !== "loading" && status !== "signing-out" && status !== "error" && !user;
  // Ask for sign-in in the modal, then return to the page that required it.
  useEffect(() => {
    if (signedOut) openAuth("signin", location);
    // Only when this guard first finds no session for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedOut]);
  if (status === "loading" || status === "signing-out")
    return <Loading label="Checking your session..." />;
  if (status === "error") return null;
  if (!user) return <Redirect to="/" />;
  if (roles && !roles.includes(user.role))
    return <Redirect to={`/dashboard/${user.role}`} />;
  return <>{children}</>;
}
