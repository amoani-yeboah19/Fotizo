// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BookingDialog } from "@/features/artisans/components/BookingDialog";
import { IncomingBookings } from "./components/IncomingBookings";
import { bookingsService } from "./services";
import type { Booking } from "@/types";

const session = vi.hoisted(() => ({ signedIn: true }));
const openAuth = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: session.signedIn ? { id: "u1", role: "buyer" } : null,
    isAuthenticated: session.signedIn,
  }),
}));
vi.mock("@/contexts/AuthModalContext", () => ({ useAuthModal: () => openAuth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/services/s1", vi.fn()] }));
vi.mock("./services", () => ({
  bookingsService: { list: vi.fn(), listIncoming: vi.fn(), request: vi.fn(), changeStatus: vi.fn() },
}));

const booking: Booking = {
  id: "b1",
  reference: "FZB-ABCDEFGH",
  serviceId: "s1",
  serviceTitle: "Braiding",
  provider: "Esi",
  providerAvatar: "",
  buyer: "Ama",
  package: "Basic",
  price: 30,
  scheduledFor: new Date(Date.now() + 86_400_000).toISOString(),
  timezone: "Africa/Accra",
  notes: "Box braids",
  status: "requested",
  statusVersion: 0,
  providerNote: "",
  meetingLink: null,
  createdAt: new Date().toISOString(),
};

function mount(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}
const dialog = <BookingDialog serviceId="s1" providerName="Esi" packageName="Basic" packagePrice={30} />;

beforeEach(() => {
  vi.resetAllMocks();
  session.signedIn = true;
});
afterEach(cleanup);

it("asks a signed-out visitor to sign in before booking", () => {
  session.signedIn = false;
  mount(dialog);
  fireEvent.click(screen.getByRole("button", { name: "Book Now" }));
  expect(openAuth).toHaveBeenCalledWith("signin", "/services/s1");
  expect(screen.queryByLabelText("Date")).toBeNull();
});

it("sends the chosen local date and time as a request with the customer's time zone", async () => {
  vi.mocked(bookingsService.request).mockResolvedValue(booking);
  mount(dialog);
  fireEvent.click(screen.getByRole("button", { name: "Book Now" }));
  const day = new Date(Date.now() + 2 * 86_400_000);
  const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: date } });
  fireEvent.change(screen.getByLabelText("Time"), { target: { value: "14:30" } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: " Box braids " } });
  fireEvent.click(screen.getByRole("button", { name: "Request Booking" }));
  await waitFor(() => expect(bookingsService.request).toHaveBeenCalled());
  const sent = vi.mocked(bookingsService.request).mock.calls[0][0];
  expect(sent).toMatchObject({ serviceId: "s1", packageName: "Basic", notes: "Box braids" });
  expect(new Date(sent.scheduledFor).getTime()).toBe(new Date(`${date}T14:30`).getTime());
  expect(sent.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Booking requested" })));
});

it("lets the provider confirm with the version they saw, a note and a meeting link", async () => {
  vi.mocked(bookingsService.listIncoming).mockResolvedValue([booking]);
  vi.mocked(bookingsService.changeStatus).mockResolvedValue({ id: "b1", status: "confirmed", statusVersion: 1 });
  mount(<IncomingBookings />);
  await screen.findByText(/Box braids/);
  fireEvent.change(screen.getByLabelText("Note to the customer (optional)"), { target: { value: "See you then" } });
  fireEvent.change(screen.getByLabelText("Meeting link for online sessions (optional)"), {
    target: { value: "https://meet.example.com/abc" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await waitFor(() =>
    expect(bookingsService.changeStatus).toHaveBeenCalledWith("b1", {
      status: "confirmed",
      expectedVersion: 0,
      note: "See you then",
      meetingLink: "https://meet.example.com/abc",
    }),
  );
});
