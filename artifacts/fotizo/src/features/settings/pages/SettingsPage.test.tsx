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
import SettingsPage from "./SettingsPage";
const state = vi.hoisted(() => ({
  user: { name: "Alice", email: "alice@example.com", hasPassword: true },
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => state }));
vi.mock("@/api", () => ({ AUTH_USE_MOCKS: false }));
vi.mock("wouter", () => ({ useLocation: () => ["/settings", state.navigate] }));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));
beforeEach(() => {
  vi.resetAllMocks();
  state.user.hasPassword = true;
});
afterEach(cleanup);
function page() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}
function passwords(confirm = "new-password") {
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "old-password" },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "new-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirm },
  });
}
it("saves the trimmed display name and shows confirmation only after success", async () => {
  state.updateProfile.mockResolvedValue({ success: true });
  page();
  fireEvent.change(screen.getByLabelText("Display name"), {
    target: { value: "  Updated Alice  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await screen.findByText("Your display name has been saved.");
  expect(state.updateProfile).toHaveBeenCalledWith("Updated Alice");
});
it("preserves profile input and shows server failure without a success notice", async () => {
  state.updateProfile.mockResolvedValue({
    success: false,
    error: "Service unavailable",
  });
  page();
  fireEvent.change(screen.getByLabelText("Display name"), {
    target: { value: "New Alice" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Service unavailable",
  );
  expect(
    (screen.getByLabelText("Display name") as HTMLInputElement).value,
  ).toBe("New Alice");
  expect(screen.queryByText("Your display name has been saved.")).toBeNull();
});
it("rejects a password-confirmation mismatch before calling the server", async () => {
  page();
  passwords("mismatch");
  fireEvent.click(
    screen.getByRole("button", { name: "Change password and sign out" }),
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "do not match",
  );
  expect(state.changePassword).not.toHaveBeenCalled();
});
it("clears password fields after a rejected change and allows a retry", async () => {
  state.changePassword
    .mockResolvedValueOnce({
      success: false,
      error: "Current password is incorrect.",
    })
    .mockResolvedValue({ success: true });
  page();
  passwords();
  fireEvent.click(
    screen.getByRole("button", { name: "Change password and sign out" }),
  );
  await screen.findByRole("alert");
  expect(
    (screen.getByLabelText("Current password") as HTMLInputElement).value,
  ).toBe("");
  expect(
    (screen.getByLabelText("New password") as HTMLInputElement).value,
  ).toBe("");
  expect(state.navigate).not.toHaveBeenCalled();
  passwords();
  fireEvent.click(
    screen.getByRole("button", { name: "Change password and sign out" }),
  );
  await waitFor(() => expect(state.navigate).toHaveBeenCalledWith("/login"));
  expect(state.changePassword).toHaveBeenLastCalledWith(
    "old-password",
    "new-password",
  );
});
it("directs Google-only users to Google without offering a local password change", () => {
  state.user.hasPassword = false;
  page();
  expect(
    screen.getByText(/Manage your password in your Google account/),
  ).toBeTruthy();
  expect(screen.queryByLabelText("Current password")).toBeNull();
});
