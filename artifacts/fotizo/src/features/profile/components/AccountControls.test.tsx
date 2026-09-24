// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  AccountDirectory,
  AccountAudit,
  AccountSummary,
} from "./AccountControls";
import DashboardManager from "../pages/ManagerDashboard";
import { adminService, type ManagedAccount } from "../services/admin.service";
import { ApiError } from "@/api/client";
const flags = vi.hoisted(() => ({ mock: false }));
vi.mock("@/api", async () => ({
  ApiError: (await import("@/api/client")).ApiError,
  get AUTH_USE_MOCKS() {
    return flags.mock;
  },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "manager-1", role: "manager" },
    isAuthenticated: true,
  }),
}));
vi.mock("../services/admin.service", () => ({
  adminService: {
    listAccounts: vi.fn(),
    changeStatus: vi.fn(),
    audit: vi.fn(),
    summary: vi.fn(),
  },
}));
vi.mock("@/features/profile/hooks", () => ({
  useDashboardSection: () => ["overview", vi.fn()],
}));
vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("@/components/layout/DashboardSidebar", () => ({
  DashboardSidebar: () => null,
}));
const account: ManagedAccount = {
  id: "9a198efb-490e-4664-ac86-a9f676b9d879",
  name: "Alice",
  email: "alice@example.com",
  role: "buyer",
  createdAt: "2026-09-01T10:00:00.000Z",
  suspendedAt: null,
  statusVersion: 3,
};
const result = {
  id: account.id,
  suspendedAt: "2026-09-24T10:00:00.000Z",
  statusVersion: 4,
  auditId: "b7bc2603-1c27-435b-9edb-552258c18916",
};
function page(children: ReactNode) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      {children}
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  flags.mock = false;
  vi.mocked(adminService.listAccounts).mockResolvedValue({
    items: [account],
    page: 0,
    hasMore: false,
  });
});
afterEach(cleanup);
async function select() {
  fireEvent.click(await screen.findByRole("button", { name: "Manage Alice" }));
}
it("requires a reason and explicit confirmation before sending the selected account version", async () => {
  vi.mocked(adminService.changeStatus).mockResolvedValue(result);
  page(<AccountDirectory onHistory={vi.fn()} />);
  await select();
  expect(adminService.changeStatus).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Reason for this change"), {
    target: { value: "short" },
  });
  fireEvent.submit(screen.getByRole("form", { name: "Change account status" }));
  expect(screen.getByRole("alert").textContent).toContain(
    "between 10 and 1000",
  );
  expect(adminService.changeStatus).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Reason for this change"), {
    target: { value: "  Verified policy violation.  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
  await screen.findByText(/Alice has been suspended/);
  expect(adminService.changeStatus).toHaveBeenCalledExactlyOnceWith(
    account.id,
    {
      action: "suspend",
      expectedVersion: 3,
      reason: "Verified policy violation.",
    },
  );
});
it("supports cancellation without sending a status change", async () => {
  page(<AccountDirectory onHistory={vi.fn()} />);
  await select();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("Reason for this change")).toBeNull();
  expect(adminService.changeStatus).not.toHaveBeenCalled();
});
it("preserves the reason after an unconfirmed failure and never claims success", async () => {
  vi.mocked(adminService.changeStatus).mockRejectedValue(new Error("offline"));
  page(<AccountDirectory onHistory={vi.fn()} />);
  await select();
  fireEvent.change(screen.getByLabelText("Reason for this change"), {
    target: { value: "Reviewed repeated abuse." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "could not be confirmed",
  );
  expect(
    (screen.getByLabelText("Reason for this change") as HTMLTextAreaElement)
      .value,
  ).toBe("Reviewed repeated abuse.");
  expect(screen.queryByText(/has been suspended/)).toBeNull();
});
it("discards a stale selection after a conflict and refreshes the account list", async () => {
  vi.mocked(adminService.changeStatus).mockRejectedValue(
    new ApiError(
      409,
      "Conflict",
      { error: "Changed" },
      "/admin/accounts/id/status",
    ),
  );
  page(<AccountDirectory onHistory={vi.fn()} />);
  await select();
  fireEvent.change(screen.getByLabelText("Reason for this change"), {
    target: { value: "Reviewed repeated abuse." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "changed while you were reviewing",
  );
  expect(screen.queryByLabelText("Reason for this change")).toBeNull();
  await waitFor(() =>
    expect(adminService.listAccounts).toHaveBeenCalledTimes(2),
  );
});
it("sends reactivation for suspended accounts and disables duplicate submissions while pending", async () => {
  vi.mocked(adminService.listAccounts).mockResolvedValue({
    items: [{ ...account, suspendedAt: result.suspendedAt }],
    page: 0,
    hasMore: false,
  });
  let resolve!: (value: typeof result) => void;
  vi.mocked(adminService.changeStatus).mockReturnValue(
    new Promise((yes) => {
      resolve = yes;
    }),
  );
  page(<AccountDirectory onHistory={vi.fn()} />);
  await select();
  fireEvent.change(screen.getByLabelText("Reason for this change"), {
    target: { value: "Review completed; restore access." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm reactivation" }));
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Saving..." }) as HTMLButtonElement)
        .disabled,
    ).toBe(true),
  );
  expect(adminService.changeStatus).toHaveBeenCalledExactlyOnceWith(
    account.id,
    expect.objectContaining({ action: "reactivate" }),
  );
  resolve(result);
  await screen.findByText(/Alice has been reactivated/);
});
it("loads another page and resets paging when searching", async () => {
  vi.mocked(adminService.listAccounts).mockResolvedValue({
    items: [account],
    page: 0,
    hasMore: true,
  });
  page(<AccountDirectory onHistory={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Next" }));
  await waitFor(() =>
    expect(adminService.listAccounts).toHaveBeenLastCalledWith({
      page: 1,
      q: "",
      status: "all",
    }),
  );
  fireEvent.change(screen.getByLabelText("Name or email"), {
    target: { value: "Alice" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() =>
    expect(adminService.listAccounts).toHaveBeenLastCalledWith({
      page: 0,
      q: "Alice",
      status: "all",
    }),
  );
});
it("supports retry and displays the real empty audit state", async () => {
  vi.mocked(adminService.audit)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ items: [], page: 0, hasMore: false });
  page(<AccountAudit targetId={account.id} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("No account status changes recorded.");
  expect(adminService.audit).toHaveBeenLastCalledWith(0, account.id);
});
it("shows real account counts and does not call staff endpoints in demo mode", async () => {
  vi.mocked(adminService.summary).mockResolvedValue({
    total: 7,
    active: 5,
    suspended: 2,
  });
  page(<AccountSummary />);
  await screen.findByText("7");
  cleanup();
  vi.clearAllMocks();
  flags.mock = true;
  page(<DashboardManager />);
  expect(
    screen.getByText("Account management is unavailable in demo mode."),
  ).toBeTruthy();
  expect(adminService.summary).not.toHaveBeenCalled();
  expect(adminService.listAccounts).not.toHaveBeenCalled();
});

it("renders an audit reason as text rather than executable markup", async () => {
  const reason = "<img src=x onerror=alert(1)>";
  vi.mocked(adminService.audit).mockResolvedValue({
    items: [
      {
        id: result.auditId,
        targetUserId: account.id,
        targetName: "Alice",
        actorId: account.id,
        actorName: "Manager",
        action: "suspend",
        reason,
        statusVersion: 4,
        createdAt: account.createdAt,
        previousSuspendedAt: null,
        suspendedAt: result.suspendedAt,
      },
    ],
    page: 0,
    hasMore: false,
  });
  page(<AccountAudit />);
  await screen.findByText(reason);
  expect(document.querySelector("img")).toBeNull();
});
