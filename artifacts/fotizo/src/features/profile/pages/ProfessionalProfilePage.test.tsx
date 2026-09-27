// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import ProfilePage from "./ProfessionalProfilePage";
import { Newsletter } from "@/features/home/components/Newsletter";
import { UserMenu } from "@/components/layout/navbar/UserMenu";
import {
  emptyProfile,
  saveProfileDraft,
  readProfileDraft,
} from "@/features/settings/profile";
const state = vi.hoisted(() => ({
  user: {
    id: "u1",
    name: "Ama Mensah",
    email: "ama@example.com",
    role: "seller",
  } as { id: string; name: string; email: string; role: string } | null,
  openAuth: vi.fn(),
  navigate: vi.fn(),
  logout: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => state }));
vi.mock("@/contexts/AuthModalContext", () => ({
  useAuthModal: () => state.openAuth,
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: state.toast }),
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("wouter", () => ({
  useLocation: () => ["/", state.navigate],
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  state.user = {
    id: "u1",
    name: "Ama Mensah",
    email: "ama@example.com",
    role: "seller",
  };
});
afterEach(cleanup);
it("opens registration from Join Fotizo and sends existing users to their dashboard", () => {
  state.user = null;
  const view = render(<Newsletter />);
  fireEvent.click(screen.getByRole("button", { name: /Join Fotizo/ }));
  expect(state.openAuth).toHaveBeenCalledWith("join", "/dashboard");
  state.user = {
    id: "u1",
    name: "Ama",
    email: "ama@example.com",
    role: "seller",
  };
  view.rerender(<Newsletter />);
  fireEvent.click(screen.getByRole("button", { name: /Join Fotizo/ }));
  expect(state.navigate).toHaveBeenCalledWith("/dashboard/seller");
});
it("opens the account panel with a click and closes with Escape", () => {
  render(<UserMenu />);
  const trigger = screen.getByRole("button", { name: "Account menu" });
  fireEvent.click(trigger);
  expect(
    screen.getByRole("link", { name: "My profile" }).getAttribute("href"),
  ).toBe("/profile");
  expect(screen.getByText("ama@example.com")).toBeTruthy();
  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(screen.queryByRole("navigation", { name: "Account" })).toBeNull();
});
it("edits a saved professional draft and displays its updated preview", () => {
  saveProfileDraft("u1", {
    ...emptyProfile,
    country: "Ghana",
    language: "English",
    headline: "Independent brand designer",
    about:
      "I help growing businesses build consistent visual identities, from logo design to practical brand guidelines for their teams.",
    skills: "Brand design, Typography",
    experience: "3–5 years",
    workMode: "Remote",
  });
  render(<ProfilePage />);
  fireEvent.click(
    screen.getByRole("button", { name: "Edit professional profile" }),
  );
  fireEvent.change(screen.getByLabelText("Professional headline"), {
    target: { value: "Brand and packaging designer" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile draft" }));
  expect(screen.getByRole("status").textContent).toContain(
    "saved on this browser",
  );
  expect(readProfileDraft("u1").headline).toBe("Brand and packaging designer");
  expect(
    screen.getByRole("link", { name: "Create a service" }).getAttribute("href"),
  ).toBe("/dashboard/seller/services/new");
});
it("lets buyers prepare a profile without pretending to change their role", () => {
  state.user!.role = "buyer";
  render(<ProfilePage />);
  expect(screen.queryByRole("link", { name: "Create a service" })).toBeNull();
  expect(
    screen.getByText(/Publishing a service requires a seller account/),
  ).toBeTruthy();
});
