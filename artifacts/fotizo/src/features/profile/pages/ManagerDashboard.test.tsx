// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import ManagerDashboard from "./ManagerDashboard";
import { adminService } from "../services/manager.service";
import { ApiError } from "@/api/client";

const state = vi.hoisted(() => ({ search: "", role: "manager" }));
vi.mock("@/api", async (original) => ({ ...(await original<typeof import("@/api")>()), ADMIN_USE_MOCKS: false }));
vi.mock("wouter", () => ({
  useSearch: () => state.search,
  useLocation: () => ["/dashboard/manager", vi.fn()],
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "m1", role: state.role } }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) => (
    <div>
      <nav>{sidebar}</nav>
      <main>{children}</main>
    </div>
  ),
}));
vi.mock("../components/Operations", () => ({
  OrderPayments: () => <p>Payments queue</p>,
  CaseQueue: ({ type }: { type: string }) => <p>{type} queue</p>,
}));
vi.mock("../services/manager.service", async (original) => ({
  ...(await original<typeof import("../services/manager.service")>()),
  adminService: {
    overview: vi.fn(),
    users: vi.fn(),
    listings: vi.fn(),
    audit: vi.fn(),
    decide: vi.fn(),
    userDetails: vi.fn(),
    changeAccount: vi.fn(),
  },
}));

const overview = {
  totalUsers: 12,
  newUsersThisMonth: 3,
  unverifiedUsers: 5,
  activeProducts: 40,
  activeServices: 7,
  ordersThisMonth: 9,
  unpublishedProducts: 2,
  unpublishedServices: 1,
};
const ama = {
  id: "u1",
  name: "Ama Mensah",
  email: "ama@example.com",
  role: "seller" as const,
  verified: false,
  status: "active" as const,
  createdAt: "2026-09-20T10:00:00Z",
};

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ManagerDashboard />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(adminService.overview).mockResolvedValue(overview);
  vi.mocked(adminService.users).mockResolvedValue({ items: [ama], total: 1, page: 1, pageSize: 20 });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.search = "";
  state.role = "manager";
});

it("shows live figures and the live-only queues to managers", async () => {
  mount();
  expect(await screen.findByText("Unverified accounts")).toBeTruthy();
  expect(screen.getByText("5")).toBeTruthy();
  for (const label of ["Payments", "Support requests", "Vehicle enquiries", "Approval queue", "Orders & disputes"])
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByText("Support requests")[0]);
  expect(await screen.findByText("support queue")).toBeTruthy();
});

it("does not load management data for other roles", () => {
  state.role = "seller";
  mount();
  expect(screen.getByText("Manager access is required for this workspace.")).toBeTruthy();
  expect(adminService.overview).not.toHaveBeenCalled();
});

it("records a verification decision with its reason and shows the server's refusal", async () => {
  state.search = "tab=users";
  vi.mocked(adminService.decide)
    .mockRejectedValueOnce(new ApiError(409, "Conflict", { error: "Record changed. Refresh and review it again." }, "/x"))
    .mockResolvedValue(undefined);
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Verification" }));
  fireEvent.change(screen.getByLabelText("Reason for this decision"), { target: { value: "Identity documents checked" } });
  fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Record changed");
  fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
  await screen.findByText("Decision saved and added to the audit trail.");
  expect(vi.mocked(adminService.decide).mock.calls[1][0]).toEqual({
    id: "u1",
    kind: "user",
    verified: true,
    expected: false,
    reason: "Identity documents checked",
  });
  await waitFor(() => expect(adminService.users).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })));
});
