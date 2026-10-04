// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { IdentityPrompt, IdentityVerification } from "./IdentityVerification";
import type { IdentitySummary } from "./identity.service";

const state = vi.hoisted(() => ({ summary: null as IdentitySummary | null }));
const start = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const refresh = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const frame = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/api", async (original) => ({ ...(await original<typeof import("@/api")>()), AUTH_USE_MOCKS: false }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("./identity.service", () => ({
  useIdentity: () => ({ data: state.summary, isLoading: false, isError: false, refetch: vi.fn() }),
  useIdentityActions: () => ({ start, refresh }),
}));
vi.mock("@veriff/incontext-sdk", () => ({
  createVeriffFrame: frame.create,
  MESSAGES: { STARTED: "STARTED", SUBMITTED: "SUBMITTED", FINISHED: "FINISHED", CANCELED: "CANCELED" },
}));

const summary = (patch: Partial<IdentitySummary> = {}): IdentitySummary => ({
  required: true,
  status: "none",
  verifiedAt: null,
  listingsVisible: true,
  dueBy: null,
  available: true,
  session: null,
  ...patch,
});

beforeEach(() => {
  vi.resetAllMocks();
  state.summary = summary();
});
afterEach(cleanup);

it("opens Veriff's check in a window and asks for the result when the seller finishes", async () => {
  start.mutateAsync.mockResolvedValue({ url: "https://alchemy.veriff.com/v/token" });
  render(<IdentityVerification />);
  expect(screen.getByText(/Fotizo receives only the result/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Verify your identity" }));
  await waitFor(() => expect(frame.create).toHaveBeenCalled());
  const options = frame.create.mock.calls[0][0] as { url: string; onEvent: (m: string) => void };
  expect(options.url).toBe("https://alchemy.veriff.com/v/token");
  options.onEvent("FINISHED");
  expect(refresh.mutate).toHaveBeenCalled();
  expect(await screen.findByText(/we're checking your documents now/)).toBeTruthy();
});

it("explains hidden listings and Veriff's reason when a new attempt is needed", () => {
  state.summary = summary({
    status: "resubmission_requested",
    listingsVisible: false,
    session: { status: "resubmission_requested", reason: "Document is not readable", createdAt: "2026-10-01T10:00:00Z" },
  });
  render(<IdentityVerification />);
  expect(screen.getByText("Please try your identity check again")).toBeTruthy();
  expect(screen.getByText("Reason: Document is not readable.")).toBeTruthy();
  expect(screen.getByText(/Your listings are hidden from buyers/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});

it("checks for a late result once while documents are being reviewed", () => {
  state.summary = summary({ status: "pending", session: { status: "submitted", reason: null, createdAt: "2026-10-01T10:00:00Z" } });
  render(<IdentityVerification />);
  expect(screen.getByText("We're checking your documents")).toBeTruthy();
  expect(refresh.mutate).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: /Verify|Try again|Continue/ })).toBeNull();
});

it("shows verified sellers no actions, and hides the dashboard prompt", () => {
  state.summary = summary({ status: "approved", verifiedAt: "2026-10-01T10:00:00Z" });
  render(<IdentityVerification />);
  expect(screen.getByText("Your identity is verified")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
  cleanup();
  render(<IdentityPrompt onOpen={vi.fn()} />);
  expect(screen.queryByText(/Verify your identity/)).toBeNull();
});

it("prompts unverified sellers with the deadline for keeping their listings visible", () => {
  const onOpen = vi.fn();
  state.summary = summary({ dueBy: "2026-11-15T00:00:00Z" });
  render(<IdentityPrompt onOpen={onOpen} />);
  expect(screen.getByText(/Verify by .* to keep your listings visible/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Verify now" }));
  expect(onOpen).toHaveBeenCalled();
});

it("waits for Veriff to be configured before offering the check", () => {
  state.summary = summary({ available: false });
  render(<IdentityVerification />);
  expect(screen.getByText(/Identity checks open soon/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Verify your identity" })).toHaveProperty("disabled", true);
});
