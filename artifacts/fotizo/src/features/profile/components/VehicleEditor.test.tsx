// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VehicleEditor } from "./VehicleEditor";
import { operationsService } from "../services/operations.service";
vi.mock("../services/operations.service", () => ({
  operationsService: { saveVehicle: vi.fn() },
}));
vi.mock("@/components/common/FormControls", async (original) => ({
  ...(await original<typeof import("@/components/common/FormControls")>()),
  ImageUploadInput: ({
    onChange,
  }: {
    onChange: (images: string[]) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(["https://example.com/car.jpg"])}
    >
      Upload photo
    </button>
  ),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("requires photos and saves a new vehicle with its specifications", async () => {
  const close = vi.fn();
  vi.mocked(operationsService.saveVehicle).mockResolvedValue({} as never);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <VehicleEditor vehicle={null} onClose={close} />
    </QueryClientProvider>,
  );
  for (const [label, value] of [
    ["Make", "BYD"],
    ["Model", "Seal"],
    ["Transmission", "Automatic"],
    ["Drivetrain", "RWD"],
    ["Engine or motor", "Electric"],
    ["Range or fuel economy", "500 km"],
    ["Description", "Reviewed car"],
    ["Estimated landed price (GBP)", "30000"],
  ]) {
    fireEvent.change(
      screen.getByLabelText(new RegExp(label.replace(/[()]/g, "\\$&"))),
      { target: { value } },
    );
  }
  fireEvent.click(
    screen.getByRole("button", { name: "Save unpublished vehicle" }),
  );
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Upload at least one vehicle photo.",
  );
  expect(operationsService.saveVehicle).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Upload photo" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Save unpublished vehicle" }),
  );
  await waitFor(() =>
    expect(operationsService.saveVehicle).toHaveBeenCalledWith(
      expect.objectContaining({
        make: "BYD",
        model: "Seal",
        landedPrice: 30000,
        images: ["https://example.com/car.jpg"],
      }),
      undefined,
    ),
  );
  await waitFor(() => expect(close).toHaveBeenCalled());
});
