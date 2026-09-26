// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import ProfessionalProfilePage from "./ProfessionalProfilePage";
import { publicProfileService } from "../services/public-profile.service";

vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "p1" }],
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }),
}));
vi.mock("../services/public-profile.service", () => ({ publicProfileService: { get: vi.fn() } }));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProfessionalProfilePage />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("shows the published profile with readable labels and the provider's services", async () => {
  vi.mocked(publicProfileService.get).mockResolvedValue({
    id: "p1",
    name: "Kofi Owusu",
    verified: true,
    joinedAt: "2026-03-01",
    headline: "Residential electrician and solar installer",
    about: "I install and maintain residential electrical systems.",
    skills: ["Wiring", "Solar systems"],
    experience: "5_10",
    workMode: "on_site",
    website: "https://owusu.example.com",
    services: [
      { id: "s1", title: "Home rewiring", category: "web-development", hourlyRate: 35, rating: 4.8, reviewCount: 12, avatar: "" },
    ],
  });
  mount();
  expect(await screen.findByText("Residential electrician and solar installer")).toBeTruthy();
  expect(screen.getByText(/5–10 years experience/)).toBeTruthy();
  expect(screen.getByText("On-site")).toBeTruthy();
  expect(screen.getByText("Solar systems")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Home rewiring/ }).getAttribute("href")).toBe("/services/s1");
  const portfolio = screen.getByRole("link", { name: /Portfolio/ });
  expect(portfolio.getAttribute("rel")).toContain("noopener");
  expect(publicProfileService.get).toHaveBeenCalledWith("p1");
});

it("says when a profile isn't public", async () => {
  vi.mocked(publicProfileService.get).mockRejectedValue(new Error("404"));
  mount();
  expect(await screen.findByText("Profile not available")).toBeTruthy();
});
