// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import ServicesPage from "./ServicesPage";
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ currency: { code: "GBP" }, convert: (n: number) => n }),
}));
vi.mock("@/features/artisans/components/ServiceCard", () => ({
  ServiceCard: ({ service }: { service: { title: string } }) => (
    <article>{service.title}</article>
  ),
}));
vi.mock("@/features/artisans/hooks", () => ({
  useServices: () => ({
    data: [
      {
        id: "1",
        title: "Build a website",
        provider: "Ama",
        category: "web-development",
        group: "freelancers",
        skills: ["React"],
        hourlyRate: 60,
        rating: 5,
        reviewCount: 5,
      },
      {
        id: "2",
        title: "Design a logo",
        provider: "Kofi",
        category: "graphic-design",
        group: "freelancers",
        skills: ["Branding"],
        hourlyRate: 25,
        rating: 3,
        reviewCount: 2,
      },
      {
        id: "3",
        title: "Fix a leak",
        provider: "Kojo",
        category: "plumbing",
        group: "artisans",
        skills: ["Plumbing"],
        hourlyRate: 40,
        rating: 4,
        reviewCount: 3,
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));
afterEach(cleanup);
it("uses service categories and filters the actual results", () => {
  render(<ServicesPage />);
  expect(screen.queryByText("Home & Living")).toBeNull();
  expect(screen.queryByText("Mum & Baby")).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: /Web Development/ }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article").textContent).toBe("Build a website");
  fireEvent.click(screen.getByRole("button", { name: "Reset all filters" }));
  expect(screen.getAllByRole("article")).toHaveLength(3);
});
it("applies rate and rating together and resets both", () => {
  render(<ServicesPage />);
  fireEvent.change(screen.getByLabelText("Maximum hourly rate"), {
    target: { value: "45" },
  });
  fireEvent.click(screen.getByRole("radio", { name: "4 stars & up" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article").textContent).toBe("Fix a leak");
  fireEvent.click(screen.getByRole("button", { name: "Reset all filters" }));
  expect(screen.getAllByRole("article")).toHaveLength(3);
});
it("sorts by price and reports contradictory price bounds", () => {
  render(<ServicesPage />);
  fireEvent.change(screen.getByLabelText("Sort services"), {
    target: { value: "price-low" },
  });
  expect(screen.getAllByRole("article")[0].textContent).toBe("Design a logo");
  fireEvent.change(screen.getByLabelText("Minimum hourly rate"), {
    target: { value: "100" },
  });
  fireEvent.change(screen.getByLabelText("Maximum hourly rate"), {
    target: { value: "20" },
  });
  expect(screen.getByRole("alert").textContent).toContain("Maximum rate");
  expect(screen.queryAllByRole("article")).toHaveLength(0);
});
