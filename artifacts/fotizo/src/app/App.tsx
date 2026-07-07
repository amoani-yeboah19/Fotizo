import type { ReactNode } from "react";
import { Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CartProvider } from "@/contexts/CartContext";
import { MessagesProvider } from "@/contexts/MessagesContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

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
      <QueryClientProvider client={queryClient}>
        <GoogleAuthWrapper>
        <AuthProvider>
        <CurrencyProvider>
          <CartProvider>
            <MessagesProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <AppRoutes />
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </MessagesProvider>
          </CartProvider>
        </CurrencyProvider>
      </AuthProvider>
      </GoogleAuthWrapper>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
