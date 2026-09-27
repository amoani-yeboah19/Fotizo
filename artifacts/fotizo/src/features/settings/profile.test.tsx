// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AccountProfileForm } from "./components/AccountProfileForm";
import { profileService } from "./profile.service";
import { ApiError } from "@/api/client";
import {
  emptyProfile,
  fromProfileInput,
  readProfileDraft,
  saveProfileDraft,
  toProfileInput,
  validateProfile,
} from "./profile";

vi.mock("@/api", async (original) => ({ ...(await original<typeof import("@/api")>()), AUTH_USE_MOCKS: false }));
vi.mock("./profile.service", () => ({ profileService: { get: vi.fn(), save: vi.fn() } }));
const buyer = {
  ...emptyProfile,
  country: "Ghana",
  language: "English",
  purpose: "Hiring professionals",
};
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(profileService.get).mockReset();
  vi.mocked(profileService.save).mockReset();
});
it("requires professional qualifications without imposing them on buyers", () => {
  expect(validateProfile(buyer, "buyer")).toBeNull();
  expect(validateProfile(buyer, "seller")).toContain("headline");
  expect(
    validateProfile({ ...buyer, accountType: "business" }, "buyer"),
  ).toContain("organisation");
  expect(
    validateProfile(
      {
        ...buyer,
        headline: "Residential electrician",
        about:
          "I install and maintain residential electrical systems, helping clients plan safe and reliable home improvements.",
        skills: "Wiring, Installation",
        experience: "3–5 years",
        workMode: "On-site",
      },
      "seller",
    ),
  ).toBeNull();
});
it("isolates drafts by account and tolerates malformed browser data", () => {
  expect(saveProfileDraft("alice", buyer)).toBe(true);
  expect(readProfileDraft("alice").country).toBe("Ghana");
  expect(readProfileDraft("bob")).toEqual(emptyProfile);
  localStorage.setItem("fotizo_profile_draft_v1:alice", "broken");
  expect(readProfileDraft("alice")).toEqual(emptyProfile);
});
it("never accepts executable portfolio URLs", () => {
  expect(
    validateProfile({ ...buyer, website: "javascript:alert(1)" }, "buyer"),
  ).toContain("HTTPS");
});
const professional = {
  ...buyer,
  purpose: "",
  headline: "Residential electrician",
  about:
    "I install and maintain residential electrical systems, helping clients plan safe and reliable home improvements.",
  skills: "Wiring, Solar systems",
  experience: "5–10 years",
  workMode: "On-site and remote",
  website: "https://example.com",
};

it("sends stable codes and a skills list to the API and maps them back to the form", () => {
  const input = toProfileInput(professional);
  expect(input).toMatchObject({
    skills: ["Wiring", "Solar systems"],
    experience: "5_10",
    workMode: "on_site_and_remote",
    purpose: "",
    company: "",
  });
  expect(toProfileInput(buyer).purpose).toBe("hiring");
  expect(fromProfileInput(input)).toEqual(professional);
});

function mount(role = "buyer") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AccountProfileForm userId="alice" role={role} />
    </QueryClientProvider>,
  );
}

it("loads the account's saved details and saves changes with the version it read", async () => {
  vi.mocked(profileService.get).mockResolvedValue({ profile: buyer, version: 3 });
  vi.mocked(profileService.save).mockImplementation(async (_id, value) => ({ profile: value, version: 4 }));
  mount();
  const city = await screen.findByLabelText("City (optional)");
  expect((screen.getByLabelText("Country of residence") as HTMLInputElement).value).toBe("Ghana");
  fireEvent.change(city, { target: { value: "Tema" } });
  fireEvent.click(screen.getByRole("button", { name: "Save details" }));
  expect(await screen.findByText("Your details have been saved to your account.")).toBeTruthy();
  expect(profileService.save).toHaveBeenCalledWith("alice", { ...buyer, city: "Tema" }, 3);
  // The next save continues from the version just returned.
  fireEvent.click(screen.getByRole("button", { name: "Save details" }));
  await waitFor(() => expect(vi.mocked(profileService.save).mock.calls[1][2]).toBe(4));
});

it("explains a conflicting edit and reloads the latest version on request", async () => {
  vi.mocked(profileService.get)
    .mockResolvedValueOnce({ profile: buyer, version: 1 })
    .mockResolvedValue({ profile: { ...buyer, city: "Kumasi" }, version: 2 });
  vi.mocked(profileService.save).mockRejectedValue(
    new ApiError(409, "Conflict", { error: "Your profile was changed elsewhere." }, "/api/account/profile"),
  );
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Save details" }));
  expect((await screen.findByRole("alert")).textContent).toContain("changed elsewhere");
  fireEvent.click(screen.getByRole("button", { name: "Load latest version" }));
  await waitFor(() =>
    expect((screen.getByLabelText("City (optional)") as HTMLInputElement).value).toBe("Kumasi"),
  );
  expect(screen.queryByRole("alert")).toBeNull();
});

it("offers to import an earlier browser draft and removes it once saved to the account", async () => {
  saveProfileDraft("alice", buyer);
  vi.mocked(profileService.get).mockResolvedValue({ profile: null, version: 0 });
  vi.mocked(profileService.save).mockImplementation(async (_id, value) => ({ profile: value, version: 1 }));
  mount();
  // Nothing is imported until the owner asks.
  fireEvent.click(await screen.findByRole("button", { name: "Use saved details" }));
  expect((screen.getByLabelText("Country of residence") as HTMLInputElement).value).toBe("Ghana");
  fireEvent.click(screen.getByRole("button", { name: "Save details" }));
  await screen.findByText("Your details have been saved to your account.");
  expect(profileService.save).toHaveBeenCalledWith("alice", buyer, 0);
  expect(readProfileDraft("alice")).toEqual(emptyProfile);
});

it("does not save details that fail the role's requirements", async () => {
  vi.mocked(profileService.get).mockResolvedValue({ profile: null, version: 0 });
  mount("seller");
  fireEvent.change(await screen.findByLabelText("Country of residence"), { target: { value: "Ghana" } });
  fireEvent.change(screen.getByLabelText("Preferred communication language"), { target: { value: "English" } });
  // Submitted directly: the browser's own required-field check would stop a click first.
  fireEvent.submit(screen.getByRole("button", { name: "Save details" }).closest("form")!);
  expect(screen.getByRole("alert").textContent).toContain("headline");
  expect(profileService.save).not.toHaveBeenCalled();
});

it("prompts accounts without a profile and shows which policy versions they accepted", async () => {
  vi.mocked(profileService.get).mockResolvedValue({
    profile: null,
    version: 0,
    accepted: [
      { policy: "privacy", version: "2026-08-15", acceptedAt: "2026-09-26T10:00:00Z" },
      { policy: "terms", version: "2026-08-15", acceptedAt: "2026-09-26T10:00:00Z" },
    ],
  });
  mount();
  expect(await screen.findByText(/Complete your profile/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href")).toBe("/terms");
  expect(screen.getByText(/Privacy Policy/).closest("p")!.textContent).toContain("version 2026-08-15");
});
