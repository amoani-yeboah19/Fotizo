// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PhotoListingAssist } from "./PhotoListingAssist";
import {
  suggestFromPhotos,
  type PhotoListingDraft,
} from "@/services/ai.service";
vi.mock("@/api", () => ({
  AUTH_USE_MOCKS: false,
  apiErrorMessage: () => "Try again manually.",
}));
vi.mock("@/services/ai.service", () => ({ suggestFromPhotos: vi.fn() }));
const draft: PhotoListingDraft = {
  title: "Red blouse",
  description: "A red long-sleeve blouse.",
  tags: ["red"],
  skills: [],
  specs: [],
  vehicle: {
    make: "",
    model: "",
    bodyType: "",
    fuel: "",
    transmission: "",
    drivetrain: "",
    powertrain: "",
    efficiency: "",
  },
};
beforeEach(() => {
  vi.mocked(suggestFromPhotos).mockResolvedValue(draft);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("automatically analyses new uploads once and exposes suggestions for review", async () => {
  const apply = vi.fn();
  const view = render(
    <PhotoListingAssist images={[]} kind="product" onDraft={apply} />,
  );
  view.rerender(
    <PhotoListingAssist
      images={["https://example.com/a.jpg"]}
      kind="product"
      onDraft={apply}
    />,
  );
  await waitFor(() => expect(apply).toHaveBeenCalledWith(draft), {
    timeout: 2000,
  });
  view.rerender(
    <PhotoListingAssist
      images={["https://example.com/a.jpg"]}
      kind="product"
      onDraft={apply}
    />,
  );
  expect(suggestFromPhotos).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Review AI suggestions")).toBeTruthy();
});
it("waits until uploading finishes before analysing", async () => {
  const apply = vi.fn();
  const view = render(
    <PhotoListingAssist images={[]} kind="vehicle" disabled onDraft={apply} />,
  );
  view.rerender(
    <PhotoListingAssist
      images={["https://example.com/a.jpg"]}
      kind="vehicle"
      disabled
      onDraft={apply}
    />,
  );
  expect(suggestFromPhotos).not.toHaveBeenCalled();
  view.rerender(
    <PhotoListingAssist
      images={["https://example.com/a.jpg"]}
      kind="vehicle"
      onDraft={apply}
    />,
  );
  await waitFor(() => expect(apply).toHaveBeenCalledWith(draft), {
    timeout: 2000,
  });
});
it("does not auto analyse existing photos and lets users retry failures", async () => {
  vi.mocked(suggestFromPhotos).mockRejectedValueOnce(new Error("offline"));
  const apply = vi.fn();
  render(
    <PhotoListingAssist
      images={["https://example.com/a.jpg"]}
      kind="service"
      onDraft={apply}
    />,
  );
  expect(suggestFromPhotos).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Suggest from photos" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Retry photo suggestions" }),
  );
  await waitFor(() => expect(apply).toHaveBeenCalledWith(draft));
});
it("ignores an old response after the selected photos are removed", async () => {
  let resolve!: (value: PhotoListingDraft) => void;
  vi.mocked(suggestFromPhotos).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const apply = vi.fn();
  const view = render(
    <PhotoListingAssist
      images={["https://example.com/a.jpg"]}
      kind="vehicle"
      onDraft={apply}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Suggest from photos" }));
  view.rerender(
    <PhotoListingAssist images={[]} kind="vehicle" onDraft={apply} />,
  );
  resolve(draft);
  await Promise.resolve();
  expect(apply).not.toHaveBeenCalled();
});
