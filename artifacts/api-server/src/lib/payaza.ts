import { createHmac, timingSafeEqual } from "node:crypto";
export class PayazaError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export const payazaMode = () => process.env.PAYAZA_MODE ?? "Test";
export const payazaReady = () => Boolean(process.env.PAYAZA_PUBLIC_KEY?.trim() && process.env.PAYAZA_SECRET_KEY?.trim() && ["Test", "Live"].includes(payazaMode()));
export function payazaSignatureValid(raw: Buffer, signature?: string) {
  if (!signature || !process.env.PAYAZA_SECRET_KEY) return false;
  const expected = createHmac("sha512", process.env.PAYAZA_SECRET_KEY).update(raw).digest("base64");
  const received = Buffer.from(signature);
  return received.length === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(expected), received);
}
export async function queryPayaza(reference: string) {
  if (!payazaReady()) throw new PayazaError(503, "Payaza is not configured.");
  const base = process.env.PAYAZA_API_URL ?? "https://api.payaza.africa/live";
  const url = new URL(base.replace(/\/+$/, "") + "/merchant-collection/transfer_notification_controller/merchant/transaction-query");
  url.searchParams.set("merchant_reference", reference);
  let response: Response;
  try {
    response = await fetch(url, { headers: { "X-TenantID": payazaMode().toLowerCase(), Authorization: "Payaza " + Buffer.from(process.env.PAYAZA_PUBLIC_KEY!).toString("base64") }, signal: AbortSignal.timeout(15000) });
  } catch { throw new PayazaError(502, "Payaza could not be reached. Please try again."); }
  if (response.status === 404) return null;
  if (!response.ok) throw new PayazaError(502, "Payaza could not confirm this payment. Please try again.");
  const body = await response.json().catch(() => null) as { success?: boolean; data?: Record<string, unknown> } | null;
  if (!body || body.success !== true || !body.data) throw new PayazaError(502, "Payaza returned an invalid payment response.");
  const data = body.data;
  if (data.merchant_transaction_reference !== reference) throw new PayazaError(502, "Payaza returned a different payment reference.");
  return {
    succeeded: data.transaction_status === "Completed",
    failed: data.transaction_status === "Failed",
    amountMinor: typeof data.amount_received === "number" && Number.isFinite(data.amount_received) ? Math.round(data.amount_received * 100) : undefined,
    currency: typeof data.currency === "string" ? data.currency : undefined,
  };
}
