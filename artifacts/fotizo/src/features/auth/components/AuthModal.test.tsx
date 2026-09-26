// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AuthModal } from "./AuthModal";
import { GoogleRolePickerDialog } from "./GoogleRolePickerDialog";
import { emptyProfile, readProfileDraft } from "@/features/settings/profile";
const state = vi.hoisted(() => ({
  signup: vi.fn(),
  login: vi.fn(),
  completeGoogleSignup: vi.fn(),
  navigate: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => state }));
vi.mock("wouter", () => ({ useLocation: () => ["/", state.navigate] }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: state.toast }),
}));
vi.mock("./GoogleAuthButton", () => ({ GoogleAuthButton: () => null }));
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});
afterEach(cleanup);
function credentials(confirmation = "my-long-passphrase") {
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: " Alice Buyer " },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "alice@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
    target: { value: "my-long-passphrase" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: confirmation },
  });
}
function buyerDetails() {
  fireEvent.change(screen.getByLabelText("Country of residence"), {
    target: { value: "Ghana" },
  });
  fireEvent.change(screen.getByLabelText("Preferred communication language"), {
    target: { value: "English" },
  });
  fireEvent.change(screen.getByLabelText("What will you use Fotizo for?"), {
    target: { value: "Hiring professionals" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
}
it("validates confirmation before advancing or registering", () => {
  render(<AuthModal open initialView="join" onOpenChange={vi.fn()} />);
  credentials("different-passphrase");
  fireEvent.click(screen.getByRole("button", { name: "Continue to profile" }));
  expect(screen.getByRole("alert").textContent).toContain("do not match");
  expect(state.signup).not.toHaveBeenCalled();
});
it("collects buyer details before signup while preserving the supported API payload", async () => {
  state.signup.mockResolvedValue({ success: true, user: { id: "alice" } });
  render(<AuthModal open initialView="join" onOpenChange={vi.fn()} />);
  credentials();
  fireEvent.click(screen.getByRole("button", { name: "Continue to profile" }));
  expect(state.signup).not.toHaveBeenCalled();
  buyerDetails();
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() => expect(state.navigate).toHaveBeenCalled());
  expect(state.signup).toHaveBeenCalledWith({
    name: "Alice Buyer",
    email: "alice@example.com",
    password: "my-long-passphrase",
    role: "buyer",
    acceptedTerms: true,
    profile: expect.objectContaining({ country: "Ghana", language: "English", purpose: "hiring" }),
  });
  // The profile goes to the account, not to browser storage.
  expect(readProfileDraft("alice")).toEqual(emptyProfile);
  expect(JSON.stringify(localStorage)).not.toContain("my-long-passphrase");
});
it("retains account fields when returning from the professional step", () => {
  render(<AuthModal open initialView="join" onOpenChange={vi.fn()} />);
  credentials();
  fireEvent.click(
    screen.getByRole("button", { name: "Provide services or sell" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue to profile" }));
  expect(screen.getByLabelText("Professional headline")).toBeTruthy();
  expect(screen.queryByLabelText("What will you use Fotizo for?")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Back to account access" }),
  );
  expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
    "alice@example.com",
  );
});
it("uses the same buyer onboarding for Google accounts", async () => {
  const onComplete = vi.fn();
  state.completeGoogleSignup.mockResolvedValue({
    success: true,
    user: { id: "google-user" },
  });
  render(
    <GoogleRolePickerDialog
      pendingToken="pending"
      onClose={vi.fn()}
      onComplete={onComplete}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue to profile" }));
  expect(state.completeGoogleSignup).not.toHaveBeenCalled();
  buyerDetails();
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledWith("buyer"));
  expect(state.completeGoogleSignup).toHaveBeenCalledWith(
    "pending",
    "buyer",
    expect.objectContaining({ country: "Ghana", purpose: "hiring" }),
  );
});
