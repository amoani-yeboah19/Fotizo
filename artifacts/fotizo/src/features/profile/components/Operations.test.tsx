// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/api/client";
import { CaseQueue, VehicleCatalogueControls } from "./Operations";
import { operationsService, type SupportCase } from "../services/operations.service";

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  AUTH_USE_MOCKS: false,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "manager-1", role: "manager" }, isAuthenticated: true }),
}));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }),
}));
vi.mock("../services/operations.service", () => ({
  operationsService: {
    overview: vi.fn(),
    supportCases: vi.fn(),
    enquiryCases: vi.fn(),
    caseEvents: vi.fn(),
    changeCaseStatus: vi.fn(),
    vehicles: vi.fn(),
    setVehicleStatus: vi.fn(),
  },
}));

const openCase: SupportCase = {
  id: "c1",
  reference: "FZS-ABCDEFGH",
  topic: "not-received",
  orderRef: "FZ-1",
  name: "Ama",
  email: "ama@example.com",
  phone: "",
  message: "Where is my parcel?",
  status: "open",
  statusVersion: 0,
  createdAt: "2026-09-24T10:00:00.000Z",
  updatedAt: "2026-09-24T10:00:00.000Z",
};

function mount(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(operationsService.caseEvents).mockResolvedValue([]);
});
afterEach(cleanup);

it("moves a case with its loaded version and note, then refreshes the queue", async () => {
  vi.mocked(operationsService.supportCases)
    .mockResolvedValueOnce({ items: [openCase], page: 0, hasMore: false })
    .mockResolvedValue({ items: [{ ...openCase, status: "in_progress", statusVersion: 1 }], page: 0, hasMore: false });
  vi.mocked(operationsService.changeCaseStatus).mockResolvedValue({ id: "c1", status: "in_progress", statusVersion: 1 });
  mount(<CaseQueue type="support" />);
  fireEvent.click(await screen.findByRole("button", { name: /FZS-ABCDEFGH/ }));
  fireEvent.change(screen.getByLabelText(/Note for the case history/), { target: { value: " Tracing " } });
  // A resolved or open case never offers its own status as an action.
  expect(screen.queryByRole("button", { name: "Mark open" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Mark in progress" }));
  await waitFor(() =>
    expect(operationsService.changeCaseStatus).toHaveBeenCalledWith("support", "c1", {
      status: "in_progress",
      expectedVersion: 0,
      note: "Tracing",
    }),
  );
  await waitFor(() => expect(operationsService.supportCases).toHaveBeenCalledTimes(2));
});

it("shows the server's conflict message instead of pretending the change worked", async () => {
  vi.mocked(operationsService.supportCases).mockResolvedValue({ items: [openCase], page: 0, hasMore: false });
  vi.mocked(operationsService.changeCaseStatus).mockRejectedValue(
    new ApiError(409, "Conflict", { error: "This case changed since you loaded it. Refresh and try again." }, "/x"),
  );
  mount(<CaseQueue type="support" />);
  fireEvent.click(await screen.findByRole("button", { name: /FZS-ABCDEFGH/ }));
  fireEvent.click(screen.getByRole("button", { name: "Mark resolved" }));
  expect((await screen.findByRole("alert")).textContent).toContain("changed since you loaded it");
});

it("filters by status from the first page", async () => {
  vi.mocked(operationsService.enquiryCases).mockResolvedValue({ items: [], page: 0, hasMore: false });
  mount(<CaseQueue type="vehicle_enquiry" />);
  await screen.findByText("No vehicle enquiries with this status.");
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "quoted" } });
  await waitFor(() => expect(operationsService.enquiryCases).toHaveBeenLastCalledWith(0, "quoted"));
});

it("publishes an unpublished vehicle", async () => {
  vi.mocked(operationsService.vehicles).mockResolvedValue([
    {
      id: "v1", slug: "byd-seal", make: "BYD", model: "Seal", bodyType: "sedan", fuel: "electric", seats: 5,
      transmission: "", drivetrain: "", powertrain: "", efficiency: "", landedPrice: 30000,
      leadTimeWeeks: [8, 12], image: "", images: [], highlights: [], description: "", status: "unpublished",
    },
  ]);
  vi.mocked(operationsService.setVehicleStatus).mockResolvedValue({} as never);
  mount(<VehicleCatalogueControls />);
  fireEvent.click(await screen.findByRole("button", { name: "Publish" }));
  await waitFor(() => expect(operationsService.setVehicleStatus).toHaveBeenCalledWith("v1", "active"));
});

it("filters vehicle records and opens unpublished vehicle details", async () => {
  vi.mocked(operationsService.vehicles).mockResolvedValue([
    {id:"v1",slug:"byd-seal",make:"BYD",model:"Seal",bodyType:"sedan",fuel:"electric",seats:5,transmission:"Automatic",drivetrain:"RWD",powertrain:"Electric motor",efficiency:"500 km",landedPrice:30000,leadTimeWeeks:[8,12],image:"/seal.jpg",images:[],highlights:[],description:"Private catalogue description",status:"unpublished"},
  ]);
  mount(<VehicleCatalogueControls />);
  fireEvent.click(await screen.findByRole("button",{name:"View BYD Seal"}));
  expect(await screen.findByText("Private catalogue description")).toBeTruthy();
  expect(screen.getByText("8–12 weeks")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Close"}));
  fireEvent.change(screen.getByLabelText("Filter vehicle visibility"),{target:{value:"active"}});
  expect(screen.getByText("No vehicles match this view.")).toBeTruthy();
  expect(operationsService.setVehicleStatus).not.toHaveBeenCalled();
});
