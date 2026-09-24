// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MyServicesTable } from "./MyServicesTable";
import { artisansService } from "@/features/artisans/services";
import { api } from "@/api";
import type { Service } from "@/types";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "p1", role: "seller" }, isAuthenticated: true }),
}));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  ARTISANS_USE_MOCKS: false,
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() },
}));

const service = (id: string, status: "active" | "unpublished"): Service => ({
  id,
  title: `Braiding ${id}`,
  description: "Neat braids",
  provider: "Esi",
  providerId: "p1",
  avatar: "",
  rating: 0,
  reviewCount: 0,
  experience: "1–3 years",
  hourlyRate: 20,
  category: "plumbing",
  group: "artisans",
  availability: "Available now",
  packages: [{ name: "Basic", price: 30, delivery: "1 day", description: "" }],
  skills: ["Braids"],
  status,
});

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MyServicesTable />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.get).mockResolvedValue([service("a", "active"), service("b", "unpublished")]);
  vi.mocked(api.post).mockResolvedValue(service("a", "unpublished"));
});
afterEach(cleanup);

it("lists the provider's services with edit links and withdrawn state", async () => {
  mount();
  await screen.findByText("Braiding a");
  expect(api.get).toHaveBeenCalledWith("/provider/services");
  expect(screen.getByText("withdrawn")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Edit Braiding a" }).closest("a")?.getAttribute("href")).toBe(
    "/dashboard/seller/services/a/edit",
  );
});

it("asks before withdrawing, and republishes directly", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Withdraw Braiding a" }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/services/a/status", { status: "unpublished" }));
  fireEvent.click(screen.getByRole("button", { name: "Republish Braiding b" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/services/b/status", { status: "active" }));
});

it("saves edits with only the fields a provider may change", async () => {
  vi.mocked(api.patch).mockResolvedValue(service("a", "active"));
  const { provider, providerId, ...editable } = { ...service("a", "active"), provider: "Esi", providerId: "p1" };
  await artisansService.updateService("a", {
    title: editable.title,
    category: editable.category,
    description: editable.description,
    experience: editable.experience,
    hourlyRate: 25,
    availability: editable.availability,
    skills: editable.skills,
    avatar: "https://example.com/a.jpg",
    packages: editable.packages,
    provider,
    providerId,
  });
  const [path, body] = vi.mocked(api.patch).mock.calls[0];
  expect(path).toBe("/services/a");
  expect(body).toMatchObject({ title: "Braiding a", hourlyRate: 25 });
  expect(Object.keys(body as object).sort()).toEqual(
    ["availability", "avatar", "category", "description", "experience", "hourlyRate", "packages", "skills", "title"],
  );
});
