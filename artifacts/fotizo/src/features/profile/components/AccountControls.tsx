import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, AUTH_USE_MOCKS } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminService,
  type ManagedAccount,
  type AccountFilters,
} from "../services/admin.service";

function useManagerQuery<T>(
  key: readonly unknown[],
  queryFn: () => Promise<T>,
) {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["admin", user?.id, ...key],
    queryFn,
    enabled: isAuthenticated && user?.role === "manager" && !AUTH_USE_MOCKS,
  });
}
function Failure({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border p-4 space-y-3">
      <p>
        These records could not be loaded. Check your connection and manager
        access, then retry.
      </p>
      <Button variant="outline" onClick={retry}>
        Retry
      </Button>
    </div>
  );
}
function Paging({
  page,
  hasMore,
  pending,
  change,
}: {
  page: number;
  hasMore: boolean;
  pending: boolean;
  change: (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-4 mt-4">
      <Button
        variant="outline"
        disabled={page === 0 || pending}
        onClick={() => change(page - 1)}
      >
        Previous
      </Button>
      <span>Page {page + 1}</span>
      <Button
        variant="outline"
        disabled={!hasMore || pending}
        onClick={() => change(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

export function AccountSummary() {
  const query = useManagerQuery(["summary"], adminService.summary);
  if (query.isError) return <Failure retry={() => void query.refetch()} />;
  if (!query.data) return <p role="status">Loading account counts...</p>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {(
        [
          ["Buyer and seller accounts", query.data.total],
          ["Active accounts", query.data.active],
          ["Suspended accounts", query.data.suspended],
        ] as const
      ).map(([label, value]) => (
        <div className="rounded-xl border bg-white p-6" key={label}>
          <dt>{label}</dt>
          <dd className="text-3xl font-bold mt-2">{value.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AccountDirectory({
  onHistory,
}: {
  onHistory: (account: ManagedAccount) => void;
}) {
  const [filters, setFilters] = useState<AccountFilters>({
    page: 0,
    q: "",
    status: "all",
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ManagedAccount | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const cache = useQueryClient();
  const query = useManagerQuery(["accounts", filters], () =>
    adminService.listAccounts(filters),
  );
  const mutation = useMutation({
    mutationFn: ({
      account,
      reason,
    }: {
      account: ManagedAccount;
      reason: string;
    }) =>
      adminService.changeStatus(account.id, {
        action: account.suspendedAt ? "reactivate" : "suspend",
        expectedVersion: account.statusVersion,
        reason,
      }),
    onSuccess: async (_result, variables) => {
      setSelected(null);
      setReason("");
      setMessage(
        `${variables.account.name} has been ${variables.account.suspendedAt ? "reactivated" : "suspended"}. The change was recorded in the audit history.`,
      );
      await cache.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setSelected(null);
        setReason("");
        setError(
          "This account changed while you were reviewing it. Check the refreshed account and start again.",
        );
      } else
        setError(
          "The change could not be confirmed. Refresh the account and check its audit history before retrying.",
        );
      void cache.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  function select(account: ManagedAccount) {
    setSelected(account);
    setReason("");
    setError("");
    setMessage("");
  }
  function filter(next: AccountFilters) {
    setFilters(next);
    setSelected(null);
    setReason("");
    setError("");
    setMessage("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || mutation.isPending) return;
    if (reason.trim().length < 10 || reason.trim().length > 1000) {
      setError("Provide a reason between 10 and 1000 characters.");
      return;
    }
    setError("");
    setMessage("");
    mutation.mutate({ account: selected, reason: reason.trim() });
  }
  return (
    <section className="space-y-5" aria-label="Customer accounts">
      <p className="text-sm text-muted-foreground">
        Manage buyer and seller access. Staff accounts and role changes are
        protected.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          filter({ ...filters, page: 0, q: search.trim() });
        }}
      >
        <div className="flex-1 min-w-48">
          <label htmlFor="account-search">Name or email</label>
          <Input
            id="account-search"
            maxLength={120}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={mutation.isPending}
          />
        </div>
        <div>
          <label htmlFor="account-status">Status</label>
          <select
            id="account-status"
            className="block rounded border h-10 px-3"
            value={filters.status}
            onChange={(e) =>
              filter({
                ...filters,
                page: 0,
                status: e.target.value as AccountFilters["status"],
              })
            }
            disabled={mutation.isPending}
          >
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          Search
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {selected && (
        <form
          onSubmit={submit}
          className="rounded-xl border bg-white p-5 space-y-4"
          aria-label="Change account status"
        >
          <h2 className="font-bold">
            {selected.suspendedAt ? "Reactivate" : "Suspend"} {selected.name}
          </h2>
          <p>{selected.email}</p>
          <p className="text-sm">
            {selected.suspendedAt
              ? "Access will be restored. The account must sign in again."
              : "The account will lose access and all existing sessions will be revoked."}
          </p>
          <label className="block" htmlFor="account-reason">
            Reason for this change
          </label>
          <Textarea
            id="account-reason"
            required
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={mutation.isPending}
          />
          <p className="text-sm text-muted-foreground">
            This reason will be retained in the manager audit history.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Saving..."
                : selected.suspendedAt
                  ? "Confirm reactivation"
                  : "Confirm suspension"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => {
                setSelected(null);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {query.isError ? (
        <Failure retry={() => void query.refetch()} />
      ) : query.isPending ? (
        <p role="status">Loading accounts...</p>
      ) : (
        <>
          {!query.data.items.length ? (
            <p>No accounts match these filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    {["Account", "Role", "Joined", "Status", "Actions"].map(
                      (label) => (
                        <th key={label} scope="col" className="p-3">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((account) => (
                    <tr key={account.id} className="border-t">
                      <td className="p-3">
                        <p className="font-semibold">{account.name}</p>
                        <p>{account.email}</p>
                      </td>
                      <td className="p-3 capitalize">{account.role}</td>
                      <td className="p-3">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {account.suspendedAt ? "Suspended" : "Active"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={mutation.isPending}
                            onClick={() => select(account)}
                            aria-label={`Manage ${account.name}`}
                          >
                            Manage
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={mutation.isPending}
                            onClick={() => onHistory(account)}
                            aria-label={`History for ${account.name}`}
                          >
                            History
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paging
            page={filters.page}
            hasMore={query.data.hasMore}
            pending={mutation.isPending || query.isFetching}
            change={(page) => filter({ ...filters, page })}
          />
        </>
      )}
    </section>
  );
}

export function AccountAudit({ targetId }: { targetId?: string }) {
  const [page, setPage] = useState(0);
  const query = useManagerQuery(["audit", targetId, page], () =>
    adminService.audit(page, targetId),
  );
  if (query.isError) return <Failure retry={() => void query.refetch()} />;
  if (!query.data) return <p role="status">Loading audit history...</p>;
  return (
    <section aria-label="Account audit history" className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Account status changes, most recent first. Account names reflect their
        current profiles.
      </p>
      {!query.data.items.length ? (
        <p>No account status changes recorded.</p>
      ) : (
        <ol className="space-y-4">
          {query.data.items.map((entry) => (
            <li
              className="rounded-xl border bg-white p-5 space-y-2"
              key={entry.id}
            >
              <p className="font-semibold">
                {entry.targetName}:{" "}
                {entry.action === "suspend" ? "Suspended" : "Reactivated"}
              </p>
              <p className="text-sm">
                By {entry.actorName} -{" "}
                <time dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </p>
              <p className="whitespace-pre-wrap break-words">{entry.reason}</p>
              <p className="text-xs text-muted-foreground break-all">
                Account {entry.targetUserId} - Record {entry.id}
              </p>
            </li>
          ))}
        </ol>
      )}
      <Paging
        page={page}
        hasMore={query.data.hasMore}
        pending={query.isFetching}
        change={setPage}
      />
    </section>
  );
}
