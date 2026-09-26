// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SourcingDrafts } from "./SourcingDrafts";
import { readDrafts, writeDraft, validateDraft } from "./drafts";
import { csvText } from "./utils";
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "china-1" } }),
}));
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      <SourcingDrafts kind="supplier" />
    </QueryClientProvider>,
  );
}
async function fillSupplier() {
  await screen.findByText("No drafts yet. Create one to prepare the details.");
  fireEvent.click(screen.getByRole("button", { name: "Add supplier" }));
  fireEvent.change(screen.getByLabelText("Supplier name"), {
    target: { value: "Shenzhen Components" },
  });
  fireEvent.change(screen.getByLabelText("City / province"), {
    target: { value: "Shenzhen" },
  });
  fireEvent.change(screen.getByLabelText("Supply category"), {
    target: { value: "Shop" },
  });
  fireEvent.change(screen.getByLabelText("Review status"), {
    target: { value: "Under review" },
  });
}
it("creates, views and edits supplier drafts without claiming a live submission", async () => {
  mount();
  await fillSupplier();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText(
    "Draft saved on this browser. It has not been submitted or synced.",
  );
  expect(readDrafts("china-1")[0].values.name).toBe("Shenzhen Components");
  fireEvent.click(await screen.findByRole("button", { name: "View" }));
  expect(
    await screen.findByRole("heading", { name: "Draft details" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getAllByRole("button", { name: "Edit draft" }).at(-1)!,
  );
  fireEvent.change(screen.getByLabelText("Supplier name"), {
    target: { value: "Updated supplier" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(readDrafts("china-1")[0].values.name).toBe("Updated supplier"),
  );
  expect(readDrafts("china-1")).toHaveLength(1);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Search supplier drafts" }),
    { target: { value: "Missing supplier" } },
  );
  expect(screen.getByText("No drafts match your filters.")).toBeTruthy();
});
it("keeps entered values on storage failure", async () => {
  mount();
  await fillSupplier();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "could not be saved",
  );
  expect(
    (screen.getByLabelText("Supplier name") as HTMLInputElement).value,
  ).toBe("Shenzhen Components");
});
it("isolates accounts and validates quantities and dates", () => {
  const draft = {
    id: "r1",
    kind: "reorder" as const,
    values: { product: "Lamp", productId: "p1", units: "10" },
    updatedAt: new Date().toISOString(),
  };
  writeDraft("alice", draft);
  expect(readDrafts("bob")).toEqual([]);
  expect(validateDraft("reorder", { ...draft.values, units: "1.5" })).toContain(
    "whole number",
  );
  expect(
    validateDraft("shipment", {
      reference: "ABC",
      mode: "Sea",
      scope: "Shop stock",
      origin: "Shenzhen",
      destination: "Tema",
      units: "10",
      eta: "2026-02-30",
      status: "Preparing",
    }),
  ).toContain("valid estimated");
});
it("escapes CSV formula prefixes, commas and quotes", () => {
  expect(csvText([["=1+1", 'a,"b"', "\n@cmd"]])).toBe(
    '"\'=1+1","a,""b""","\'\n@cmd"',
  );
});

it("creates a freight draft with consignment details", async () => {
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><SourcingDrafts kind="shipment" /></QueryClientProvider>);
  await screen.findByText("No drafts yet. Create one to prepare the details.");
  fireEvent.click(screen.getByRole("button", {name:"New consignment"}));
  for (const [label,value] of [["Consignment reference","CN-101"],["Freight mode","Sea"],["Cargo type","Shop stock"],["Origin port / airport","Shenzhen"],["Destination port / airport","Tema"],["Units","24"],["Estimated arrival","2027-01-15"],["Planned stage","Preparing"]]) {
    fireEvent.change(screen.getByLabelText(label),{target:{value}});
  }
  fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
  expect(await screen.findByText("CN-101")).toBeTruthy();
  expect(readDrafts("china-1")[0].values.destination).toBe("Tema");
});
