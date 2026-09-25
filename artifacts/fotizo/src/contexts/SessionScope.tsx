import { useState, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
function PrivateCache({ children }: { children: ReactNode }) {
  // Each identity owns its cache and descendants; late responses stay in the old scope.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client],
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
export function SessionScope({ children }: { children: ReactNode }) {
  const { sessionKey } = useAuth();
  return <PrivateCache key={sessionKey}>{children}</PrivateCache>;
}
export function SessionNotice() {
  const { sessionError, retrySession } = useAuth();
  if (!sessionError) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[100] rounded-xl border border-destructive bg-white p-4 shadow-lg"
    >
      <p>{sessionError}</p>
      <button
        className="mt-2 underline font-semibold"
        onClick={() => void retrySession()}
      >
        Retry
      </button>
    </div>
  );
}
