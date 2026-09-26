// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProfileDraftForm } from "./components/ProfileDraftForm";
import {
  emptyProfile,
  readProfileDraft,
  saveProfileDraft,
  validateProfile,
} from "./profile";
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
it("saves and removes a browser draft with truthful feedback", () => {
  render(<ProfileDraftForm userId="alice" role="buyer" />);
  fireEvent.change(screen.getByLabelText("Country of residence"), {
    target: { value: "Ghana" },
  });
  fireEvent.change(screen.getByLabelText("Preferred communication language"), {
    target: { value: "English" },
  });
  fireEvent.change(screen.getByLabelText("What will you use Fotizo for?"), {
    target: { value: "Hiring professionals" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile draft" }));
  expect(screen.getByRole("status").textContent).toContain(
    "not been published",
  );
  expect(readProfileDraft("alice")).toEqual(buyer);
  fireEvent.click(screen.getByRole("button", { name: "Clear draft" }));
  expect(readProfileDraft("alice")).toEqual(emptyProfile);
});
it("does not report success when storage fails", () => {
  saveProfileDraft("alice", buyer);
  render(<ProfileDraftForm userId="alice" role="buyer" />);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota exceeded");
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile draft" }));
  expect(screen.getByRole("alert").textContent).toContain("could not save");
  expect(screen.queryByRole("status")).toBeNull();
});
