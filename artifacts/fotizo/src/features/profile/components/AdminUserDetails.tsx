import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_USE_MOCKS, ApiError } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminService,
  ADMIN_ROLES,
  type AccountChange,
} from "../services/admin.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Loading } from "@/components/common/QueryStates";

type PendingChange =
  | Omit<Extract<AccountChange, { action: "role" }>, "reason">
  | Omit<Extract<AccountChange, { action: "status" }>, "reason">;
const label = (value: string) => value.replaceAll("_", " ");
function errorMessage(error: unknown) {
  if (
    error instanceof ApiError &&
    error.data &&
    typeof error.data === "object" &&
    "error" in error.data
  )
    return String(error.data.error);
  return error instanceof Error
    ? error.message
    : "Unable to save the account change.";
}

export function AdminUserDetails({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { user: manager } = useAuth();
  const cache = useQueryClient();
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const details = useQuery({
    queryKey: ["admin", manager?.id, "user-details", id],
    queryFn: () => adminService.userDetails(id),
  });
  const mutation = useMutation({
    mutationFn: adminService.changeAccount,
    onSuccess: async () => {
      setPending(null);
      setReason("");
      setConfirmed(false);
      setNotice(
        ADMIN_USE_MOCKS
          ? "Demo account updated. The change is recorded in the demo audit trail."
          : "Account updated and recorded in the audit trail.",
      );
      await cache.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const start = (change: PendingChange) => {
    setPending(change);
    setReason("");
    setConfirmed(false);
    setNotice("");
    mutation.reset();
  };
  const user = details.data?.user;
  const self = manager?.id === id;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {pending ? "Confirm account change" : "User details"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? `${user.name} · ${user.email}`
              : "Profile, listings and account activity."}
          </DialogDescription>
        </DialogHeader>
        {details.isPending ? (
          <Loading label="Loading account…" />
        ) : details.isError ? (
          <div role="alert">
            <p className="text-destructive">Unable to load this account.</p>
            <Button variant="outline" onClick={() => details.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          user &&
          details.data && (
            <>
              {ADMIN_USE_MOCKS && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Demo controls only. These changes do not affect real accounts
                  or sessions and reset on reload.
                </p>
              )}
              {notice && (
                <p role="status" className="text-sm text-primary">
                  {notice}
                </p>
              )}
              {pending ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (confirmed && !self)
                      mutation.mutate({ ...pending, reason: reason.trim() });
                  }}
                >
                  <div className="rounded-xl border border-border p-4 mb-4">
                    <p className="font-medium">
                      {pending.action === "role"
                        ? "Change role"
                        : pending.value === "suspended"
                          ? "Suspend account"
                          : "Reinstate account"}
                    </p>
                    <p className="mt-1 text-sm capitalize">
                      {label(pending.expected)} → {label(pending.value)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {pending.action === "role"
                        ? "This changes the account’s assigned workspace and permissions once connected to the backend."
                        : pending.value === "suspended"
                          ? "When connected, suspension must block protected access and revoke active sessions."
                          : "When connected, reinstatement allows the account to access its permitted workspace again."}
                    </p>
                  </div>
                  <label
                    className="block text-sm font-medium mb-2"
                    htmlFor="account-reason"
                  >
                    Reason for change
                  </label>
                  <textarea
                    id="account-reason"
                    required
                    minLength={5}
                    maxLength={1000}
                    disabled={mutation.isPending}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe why this account change is needed."
                    className="w-full min-h-28 rounded-md border border-input bg-background p-3 text-sm"
                  />
                  <label className="flex items-start gap-3 mt-4 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={mutation.isPending}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      I have reviewed this change for {user.name} and confirm
                      the action.
                    </span>
                  </label>
                  {mutation.isError && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      {errorMessage(mutation.error)}
                    </p>
                  )}
                  <div className="mt-5 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => setPending(null)}
                    >
                      Cancel change
                    </Button>
                    <Button
                      type="submit"
                      variant={
                        pending.action === "status" &&
                        pending.value === "suspended"
                          ? "destructive"
                          : "default"
                      }
                      disabled={
                        mutation.isPending ||
                        !confirmed ||
                        reason.trim().length < 5 ||
                        self
                      }
                    >
                      {mutation.isPending
                        ? "Saving…"
                        : ADMIN_USE_MOCKS
                          ? "Confirm demo change"
                          : "Confirm change"}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <section className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold mb-3">Account profile</h3>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Role</dt>
                        <dd className="capitalize mt-1">{label(user.role)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Joined</dt>
                        <dd className="mt-1">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">
                          Account status
                        </dt>
                        <dd>
                          <StatusBadge
                            tone={
                              user.status === "active" ? "success" : "danger"
                            }
                          >
                            {user.status}
                          </StatusBadge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">
                          Verification
                        </dt>
                        <dd>
                          <StatusBadge
                            tone={user.verified ? "success" : "warning"}
                          >
                            {user.verified ? "Verified" : "Unverified"}
                          </StatusBadge>
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <section className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold mb-3">Account controls</h3>
                    {self && (
                      <p className="text-sm text-muted-foreground mb-3">
                        You cannot change your own role or account status here.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 items-center">
                      <label className="text-sm" htmlFor="account-role">
                        Assign role
                      </label>
                      <select
                        id="account-role"
                        aria-label="Assign account role"
                        value={user.role}
                        disabled={self || mutation.isPending}
                        onChange={(e) => {
                          const value = ADMIN_ROLES.find(
                            (r) => r === e.target.value,
                          );
                          if (value && value !== user.role)
                            start({
                              id,
                              action: "role",
                              value,
                              expected: user.role,
                            });
                        }}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm capitalize"
                      >
                        {ADMIN_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {label(role)}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant={
                          user.status === "active" ? "destructive" : "outline"
                        }
                        disabled={self || mutation.isPending}
                        onClick={() =>
                          start({
                            id,
                            action: "status",
                            value:
                              user.status === "active" ? "suspended" : "active",
                            expected: user.status,
                          })
                        }
                      >
                        {user.status === "active"
                          ? "Suspend account"
                          : "Reinstate account"}
                      </Button>
                    </div>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-3">
                      Listings ({details.data.listings.length})
                    </h3>
                    {details.data.listings.length ? (
                      <ul className="divide-y divide-border rounded-xl border border-border">
                        {details.data.listings.map((listing) => (
                          <li
                            key={`${listing.kind}-${listing.id}`}
                            className="p-3"
                          >
                            <div className="flex justify-between gap-3">
                              <p className="text-sm font-medium">
                                {listing.title}
                              </p>
                              <StatusBadge
                                tone={
                                  listing.status === "active"
                                    ? "success"
                                    : "warning"
                                }
                              >
                                {listing.status}
                              </StatusBadge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 capitalize">
                              {listing.kind} · {listing.category}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No listings belong to this account.
                      </p>
                    )}
                  </section>
                  <section>
                    <h3 className="font-semibold mb-3">
                      Recent account activity
                    </h3>
                    {details.data.activity.length ? (
                      <ul className="space-y-3">
                        {details.data.activity.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl border border-border p-3"
                          >
                            <p className="text-sm font-medium">
                              {label(item.action).replace(".", " / ")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.actor} ·{" "}
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                            <p className="text-sm whitespace-pre-wrap break-words mt-2">
                              {item.reason}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {Object.entries(item.before)
                                .map(
                                  ([key, value]) =>
                                    `${label(key)}: ${label(String(value))} → ${label(String(item.after[key]))}`,
                                )
                                .join(", ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No administrative changes recorded for this account yet.
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
