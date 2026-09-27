// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportProblem } from "./ReportProblem";
import { disputesService } from "../services/disputes.service";
import { ApiError } from "@/api/client";

vi.mock("../services/disputes.service", async (original) => ({
  ...(await original<typeof import("../services/disputes.service")>()),
  disputesService: { list: vi.fn(), open: vi.fn() },
}));

const dispute = {
  id: "d1",
  reference: "FZD-ABC23456",
  category: "damaged" as const,
  categoryLabel: "Damaged item",
  status: "open" as const,
  createdAt: "2026-09-26T10:00:00Z",
};

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReportProblem orderId="o1" />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("reports a problem and then shows its progress instead of the form", async () => {
  vi.mocked(disputesService.list).mockResolvedValueOnce([]).mockResolvedValue([dispute]);
  vi.mocked(disputesService.open).mockResolvedValue(dispute);
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Report a problem" }));
  fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  expect(screen.getByRole("alert").textContent).toContain("Choose what went wrong");
  fireEvent.change(screen.getByLabelText("What went wrong?"), { target: { value: "damaged" } });
  fireEvent.change(screen.getByLabelText("Describe the problem"), {
    target: { value: "The drill arrived with a cracked battery housing." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  expect((await screen.findByRole("status")).textContent).toBe("Damaged item · FZD-ABC23456 · Received");
  expect(disputesService.open).toHaveBeenCalledWith("o1", {
    category: "damaged",
    summary: "The drill arrived with a cracked battery housing.",
  });
  expect(screen.queryByRole("button", { name: "Report a problem" })).toBeNull();
});

it("explains when the server refuses a duplicate report", async () => {
  vi.mocked(disputesService.list).mockResolvedValue([]);
  vi.mocked(disputesService.open).mockRejectedValue(
    new ApiError(409, "Conflict", { error: "This order already has an open dispute. We'll update you on it." }, "/x"),
  );
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Report a problem" }));
  fireEvent.change(screen.getByLabelText("What went wrong?"), { target: { value: "other" } });
  fireEvent.change(screen.getByLabelText("Describe the problem"), { target: { value: "Something else went wrong." } });
  fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("already has an open dispute"));
});
