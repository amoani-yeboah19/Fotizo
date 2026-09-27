import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
export type DraftKind = "supplier" | "shipment" | "reorder";
type Field = {
  key: string;
  label: string;
  required?: boolean;
  type?: "number" | "date" | "email";
  options?: string[];
};
export const draftFields: Record<DraftKind, Field[]> = {
  supplier: [
    { key: "name", label: "Supplier name", required: true },
    { key: "city", label: "City / province", required: true },
    {
      key: "scope",
      label: "Supply category",
      required: true,
      options: ["Shop", "Autos", "Shop and Autos"],
    },
    { key: "contact", label: "Contact person" },
    { key: "email", label: "Contact email", type: "email" },
    {
      key: "status",
      label: "Review status",
      required: true,
      options: ["Under review", "Approved", "Suspended"],
    },
    { key: "notes", label: "Notes" },
  ],
  shipment: [
    { key: "reference", label: "Consignment reference", required: true },
    {
      key: "mode",
      label: "Freight mode",
      required: true,
      options: ["Air", "Sea"],
    },
    {
      key: "scope",
      label: "Cargo type",
      required: true,
      options: ["Shop stock", "Vehicles"],
    },
    { key: "origin", label: "Origin port / airport", required: true },
    { key: "destination", label: "Destination port / airport", required: true },
    { key: "units", label: "Units", type: "number", required: true },
    { key: "eta", label: "Estimated arrival", type: "date", required: true },
    {
      key: "status",
      label: "Planned stage",
      required: true,
      options: ["Preparing", "Loading", "In transit", "Customs", "Arrived"],
    },
    { key: "notes", label: "Cargo notes" },
  ],
  reorder: [
    { key: "product", label: "Product", required: true },
    { key: "productId", label: "Product ID", required: true },
    {
      key: "units",
      label: "Quantity to request",
      required: true,
      type: "number",
    },
    { key: "supplier", label: "Preferred supplier" },
    { key: "notes", label: "Purchasing notes" },
  ],
};
export function validateDraft(kind: DraftKind, values: Record<string, string>) {
  for (const field of draftFields[kind]) {
    const value = (values[field.key] ?? "").trim();
    if (field.required && !value) return `Enter ${field.label.toLowerCase()}.`;
    if (value.length > 1000)
      return `${field.label} must be 1,000 characters or fewer.`;
    if (field.options && value && !field.options.includes(value))
      return `Select a valid ${field.label.toLowerCase()}.`;
    if (
      field.type === "number" &&
      value &&
      (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1000000)
    )
      return `${field.label} must be a whole number between 1 and 1,000,000.`;
    if (
      field.type === "email" &&
      value &&
      !z.string().email().safeParse(value).success
    )
      return "Enter a valid contact email.";
    if (
      field.type === "date" &&
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      return "Enter a valid estimated arrival date.";
  }
  return null;
}
const schema = z.array(
  z.object({
    id: z.string(),
    kind: z.enum(["supplier", "shipment", "reorder"]),
    values: z.record(z.string(), z.string()),
    updatedAt: z.string(),
  }),
);
export type SourcingDraft = z.infer<typeof schema>[number];
const storageKey = (id: string) => `fotizo_sourcing_drafts_v1:${id}`;
export function readDrafts(id: string): SourcingDraft[] {
  const data = schema.parse(
    JSON.parse(localStorage.getItem(storageKey(id)) ?? "[]"),
  );
  if (data.some((d) => validateDraft(d.kind, d.values)))
    throw new Error("Invalid draft data");
  return data;
}
export function writeDraft(id: string, draft: SourcingDraft) {
  const error = validateDraft(draft.kind, draft.values);
  if (error) throw new Error(error);
  const all = readDrafts(id);
  const next = [...all.filter((d) => d.id !== draft.id), draft];
  localStorage.setItem(storageKey(id), JSON.stringify(next));
  return next;
}
export function useSourcingDrafts() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const id = user?.id ?? "";
  const queryKey = ["sourcing-drafts", id];
  const query = useQuery({
    queryKey,
    queryFn: () => readDrafts(id),
    enabled: !!id,
    retry: false,
  });
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey(id))
        void cache.invalidateQueries({ queryKey: ["sourcing-drafts", id] });
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [id, cache]);
  return {
    ...query,
    save: async (draft: SourcingDraft) => {
      if (!id) throw new Error("Sign in before saving a draft.");
      await cache.cancelQueries({ queryKey });
      cache.setQueryData(queryKey, writeDraft(id, draft));
    },
  };
}
