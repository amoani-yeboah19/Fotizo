import { createHash } from "node:crypto";

// Fotizo Shop products were first served by the frontend under readable ids
// ("ali-…", "taobao-…", "t-161"); the database stores each as a UUIDv5 of that
// id. Mapping is deterministic, so old product links, carts and saved items
// keep resolving after the shop moves to the API.
const NAMESPACE = "6f9d1c1e-6f27-4f3a-9a2f-1d7b0c5a8e42";

export function catalogueUuid(catalogueId: string): string {
  const hash = createHash("sha1")
    .update(Buffer.from(NAMESPACE.replace(/-/g, ""), "hex"))
    .update(catalogueId, "utf8")
    .digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The frontend catalogue's own id format.
const CATALOGUE_ID = /^[a-z0-9][a-z0-9-]{1,159}$/i;

/** A product id as stored: UUIDs pass through, catalogue ids are mapped; anything else is null. */
export function resolveProductId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (UUID.test(value)) return value.toLowerCase();
  return CATALOGUE_ID.test(value) ? catalogueUuid(value) : null;
}
