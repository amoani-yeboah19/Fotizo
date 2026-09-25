import { api } from "@/api";
import type {
  ManagedAccountPage,
  ManagedAccountSummary,
  AccountStatusChange,
  AccountStatusChangeResult,
  AccountAuditPage,
} from "@workspace/api-client-react";
export type {
  ManagedAccount,
  AccountStatusChange,
} from "@workspace/api-client-react";
export type AccountFilters = {
  page: number;
  q: string;
  status: "all" | "active" | "suspended";
};
export const adminService = {
  listAccounts: (filters: AccountFilters) =>
    api.get<ManagedAccountPage>("/admin/accounts", filters),
  summary: () => api.get<ManagedAccountSummary>("/admin/accounts/summary"),
  changeStatus: (id: string, input: AccountStatusChange) =>
    api.post<AccountStatusChangeResult>(`/admin/accounts/${id}/status`, input),
  audit: (page: number, targetId?: string) =>
    api.get<AccountAuditPage>("/admin/account-audit", { page, targetId }),
};
