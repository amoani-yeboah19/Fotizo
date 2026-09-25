import type { ReactNode } from "react";
import { Router as WouterRouter } from "wouter";
import { SessionScope, SessionNotice } from "@/contexts/SessionScope";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CartProvider } from "@/contexts/CartContext";
import { MessagesProvider } from "@/contexts/MessagesContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Renders children plain when no Client ID is configured yet (e.g. a fresh
// local checkout before Google Cloud credentials exist), so the app doesn't
// crash — the "Continue with Google" button itself just won't render then.
function GoogleAuthWrapper({ children }: { children: ReactNode }) {
  if (!GOOGLE_CLIENT_ID) return <>{children}</>;
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

function App() {
  return (
    <ErrorBoundary>
        <GoogleAuthWrapper>
        <AuthProvider>
        <SessionNotice />
        <SessionScope>
        <CurrencyProvider>
          <CartProvider>
            <MessagesProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <AuthModalProvider>
                    <AppRoutes />
                  </AuthModalProvider>
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </MessagesProvider>
          </CartProvider>
        </CurrencyProvider>
        </SessionScope>
      </AuthProvider>
      </GoogleAuthWrapper>
    </ErrorBoundary>
  );
}

export default App;
