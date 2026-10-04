import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, AUTH_USE_MOCKS } from "@/api";
import { useAuth } from "@/contexts/AuthContext";

// Seller identity verification through Veriff. Fotizo only receives the
// result; documents and selfies are handled by Veriff.
export type IdentityStatus = "none" | "pending" | "review" | "approved" | "declined" | "resubmission_requested";

export interface IdentitySummary {
  /** Seller accounts verify; other accounts never need to. */
  required: boolean;
  status: IdentityStatus;
  verifiedAt: string | null;
  /** Whether the seller's listings are currently public. */
  listingsVisible: boolean;
  /** Verify by this date to keep listings public (null: no deadline). */
  dueBy: string | null;
  /** False until Veriff is configured on the server. */
  available: boolean;
  session: { status: string; reason: string | null; createdAt: string } | null;
}

export const identityService = {
  get: () => api.get<IdentitySummary>("/identity"),
  /** Opens (or reopens) the seller's Veriff session. */
  start: () => api.post<{ url: string }>("/identity/session", {}),
  /** Asks the server to fetch the decision in case Veriff's webhook is late. */
  refresh: () => api.post<IdentitySummary>("/identity/refresh", {}),
};

export const useIdentity = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["identity", user?.id],
    queryFn: identityService.get,
    enabled: !AUTH_USE_MOCKS && user?.role === "seller",
  });
};

export const useIdentityActions = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const set = (summary: IdentitySummary) => qc.setQueryData(["identity", user?.id], summary);
  return {
    start: useMutation({ mutationFn: identityService.start }),
    refresh: useMutation({ mutationFn: identityService.refresh, onSuccess: set }),
  };
};
