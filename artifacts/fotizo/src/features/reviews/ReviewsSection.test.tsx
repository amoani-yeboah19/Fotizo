// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReviewsSection } from "./ReviewsSection";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  mine: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  signedIn: true,
}));
vi.mock("./reviews.service", () => ({ reviewsService: { list: mocks.list, mine: mocks.mine, save: mocks.save, remove: mocks.remove } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: mocks.signedIn }) }));
// The live site, not the demo build (which has no reviews to load).
vi.mock("@/api", async (original) => ({ ...(await original<typeof import("@/api")>()), CATALOG_USE_MOCKS: false }));

const review = (patch = {}) => ({
  id: "r1",
  rating: 4,
  comment: "Good lamp.",
  author: "Ama K.",
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
  ...patch,
});
const show = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReviewsSection kind="product" listingId="p1" />
    </QueryClientProvider>,
  );

beforeEach(() => {
  for (const fn of [mocks.list, mocks.mine, mocks.save, mocks.remove]) fn.mockReset();
  mocks.signedIn = true;
  mocks.list.mockResolvedValue({ items: [review()], total: 3, average: 4.3, breakdown: [0, 0, 0, 2, 1] });
});
afterEach(cleanup);

it("shows the average, breakdown and reviews, and tells customers who can't review yet why", async () => {
  mocks.mine.mockResolvedValue({ canReview: false, review: null });
  show();
  expect(await screen.findByText("4.3")).toBeTruthy();
  expect(screen.getByText("3 reviews")).toBeTruthy();
  expect(screen.getByText("Good lamp.")).toBeTruthy();
  expect(screen.getByText("Ama K.")).toBeTruthy();
  expect(await screen.findByText(/once an order of it has been delivered to you/)).toBeTruthy();
  expect(screen.queryByRole("radiogroup")).toBeNull();
});

it("lets a buyer with a delivered order post a review", async () => {
  mocks.mine.mockResolvedValue({ canReview: true, review: null });
  mocks.save.mockResolvedValue(review({ id: "r2", rating: 5 }));
  show();
  fireEvent.click(await screen.findByRole("radio", { name: "5 stars" }));
  fireEvent.change(screen.getByLabelText("Your review (optional)"), { target: { value: "Brilliant." } });
  fireEvent.click(screen.getByRole("button", { name: "Post review" }));
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith({ kind: "product", listingId: "p1", rating: 5, comment: "Brilliant." }),
  );
});

it("needs a star rating before posting", async () => {
  mocks.mine.mockResolvedValue({ canReview: true, review: null });
  show();
  expect(((await screen.findByRole("button", { name: "Post review" })) as HTMLButtonElement).disabled).toBe(true);
});

it("shows the buyer's own review with edit and delete", async () => {
  mocks.mine.mockResolvedValue({ canReview: true, review: review({ rating: 2, comment: "Too dim." }) });
  mocks.remove.mockResolvedValue(undefined);
  show();
  expect(await screen.findByText("Your review")).toBeTruthy();
  expect(screen.getByText("Too dim.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect((screen.getByLabelText("Your review (optional)") as HTMLTextAreaElement).value).toBe("Too dim.");
  expect(screen.getByRole("radio", { name: "2 stars" }).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("r1"));
});

it("shows reviews to signed-out visitors without asking them to review", async () => {
  mocks.signedIn = false;
  mocks.list.mockResolvedValue({ items: [], total: 0, average: null, breakdown: [0, 0, 0, 0, 0] });
  show();
  expect(await screen.findByText("No reviews yet.")).toBeTruthy();
  expect(mocks.mine).not.toHaveBeenCalled();
});
