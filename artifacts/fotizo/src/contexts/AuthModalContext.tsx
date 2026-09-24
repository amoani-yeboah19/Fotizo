import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AuthModal, type AuthView } from "@/features/auth/components/AuthModal";

// The sign-in / join modal is the only authentication screen. Any page can
// open it; `returnTo` is where a successful sign-in lands (default: home).
type OpenAuth = (view: AuthView, returnTo?: string) => void;

const AuthModalContext = createContext<OpenAuth | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ view: AuthView; returnTo?: string } | null>(null);
  const openAuth = useCallback<OpenAuth>((view, returnTo) => setState({ view, returnTo }), []);
  return (
    <AuthModalContext.Provider value={openAuth}>
      {children}
      <AuthModal
        open={state !== null}
        initialView={state?.view ?? "signin"}
        returnTo={state?.returnTo}
        onOpenChange={(open) => !open && setState(null)}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): OpenAuth {
  const openAuth = useContext(AuthModalContext);
  if (!openAuth) throw new Error("useAuthModal must be used inside AuthModalProvider");
  return openAuth;
}
