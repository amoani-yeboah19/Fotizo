import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "./logger";

// dLocal (https://docs.dlocal.com): payments, refunds and seller payouts in
// emerging markets. Settings are read on each call so a deploy or a test can
// change them without a restart.
//   DLOCAL_X_LOGIN, DLOCAL_X_TRANS_KEY, DLOCAL_SECRET_KEY  payments and refunds
//   DLOCAL_PAYOUTS_CLIENT_ID, DLOCAL_PAYOUTS_CLIENT_SECRET payouts (OAuth)
//   DLOCAL_API_URL  https://sandbox.dlocal.com for testing; live by default
const env = {
  login: () => process.env.DLOCAL_X_LOGIN?.trim() ?? "",
  transKey: () => process.env.DLOCAL_X_TRANS_KEY?.trim() ?? "",
  secret: () => process.env.DLOCAL_SECRET_KEY?.trim() ?? "",
  payoutsClientId: () => process.env.DLOCAL_PAYOUTS_CLIENT_ID?.trim() ?? "",
  payoutsClientSecret: () => process.env.DLOCAL_PAYOUTS_CLIENT_SECRET?.trim() ?? "",
  api: () => (process.env.DLOCAL_API_URL?.trim() || "https://api.dlocal.com").replace(/\/+$/, ""),
};

export const dlocalPaymentsReady = () => Boolean(env.login() && env.transKey() && env.secret());
export const dlocalPayoutsReady = () => Boolean(env.payoutsClientId() && env.payoutsClientSecret());

/**
 * Countries Fotizo takes dLocal payments from: the currency charged and the
 * national ID dLocal requires from the payer. Add a country here to offer it.
 */
export const DLOCAL_COUNTRIES = {
  GH: {
    currency: "GHS",
    document: {
      label: "Ghana Card number",
      example: "GHA-123456789-0",
      // dLocal: 3 letters and 10 digits; people usually write it GHA-123456789-0.
      normalise: (v: string) => v.toUpperCase().replace(/[\s-]/g, ""),
      valid: (v: string) => /^[A-Z]{3}\d{10}$/.test(v),
    },
  },
} as const;
export type DlocalCountry = keyof typeof DLOCAL_COUNTRIES;
export const isDlocalCountry = (country: string): country is DlocalCountry => country in DLOCAL_COUNTRIES;

export class DlocalError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** dLocal's own error code, e.g. 5014 for insufficient payout balance. */
    readonly code?: number,
  ) {
    super(message);
  }
}

/** HMAC-SHA256 over X-Login + X-Date + body with the secret key, lowercase hex. */
export function dlocalSignature(xDate: string, body: string, login = env.login(), secret = env.secret()) {
  return createHmac("sha256", secret).update(`${login}${xDate}${body}`, "utf8").digest("hex");
}

async function call(url: string, init: RequestInit, what: string) {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch (error) {
    logger.warn({ what, errorType: (error as Error)?.name }, "dLocal unreachable");
    throw new DlocalError("dLocal could not be reached. Please try again.");
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const code = typeof body.code === "number" ? body.code : undefined;
    logger.warn({ what, status: response.status, code }, "dLocal refused a request");
    throw new DlocalError(typeof body.message === "string" ? body.message : "dLocal refused the request.", response.status, code);
  }
  return body;
}

/** A signed payments-API (v2.1) request. */
function payins(method: "GET" | "POST", path: string, payload?: unknown, idempotencyKey?: string) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const xDate = new Date().toISOString();
  return call(
    `${env.api()}${path}`,
    {
      method,
      headers: {
        "X-Date": xDate,
        "X-Login": env.login(),
        "X-Trans-Key": env.transKey(),
        "X-Version": "2.1",
        "Content-Type": "application/json",
        "User-Agent": "Fotizo",
        Authorization: `V2-HMAC-SHA256, Signature: ${dlocalSignature(xDate, body)}`,
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey.slice(0, 42) } : {}),
      },
      ...(body ? { body } : {}),
    },
    path.split("/")[1] ?? "payments",
  );
}

/**
 * Checks a notification dLocal posted to us: the Authorization header must be
 * our signature over X-Login + its X-Date + the raw body.
 */
export function dlocalNotificationValid(rawBody: Buffer, xDate: string | undefined, authorization: string | undefined) {
  if (!dlocalPaymentsReady() || !xDate || !authorization) return false;
  const sent = /Signature:\s*([0-9a-f]+)/i.exec(authorization)?.[1]?.toLowerCase();
  if (!sent) return false;
  const expected = dlocalSignature(xDate, rawBody.toString("utf8"));
  const a = Buffer.from(expected);
  const b = Buffer.from(sent);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Payments ────────────────────────────────────────────────────────────────

export type DlocalPayment = {
  id: string;
  status: "PENDING" | "PAID" | "REJECTED" | "CANCELLED" | "AUTHORIZED" | "VERIFIED" | string;
  status_detail?: string;
  amount?: number;
  currency?: string;
  order_id?: string;
  redirect_url?: string;
};

export type NewDlocalPayment = {
  amount: number;
  currency: string;
  country: DlocalCountry;
  /** Our payment attempt reference. */
  orderId: string;
  description: string;
  payer: { name: string; email: string; document: string; phone?: string; userReference: string };
  callbackUrl: string;
  notificationUrl: string;
};

/**
 * Opens dLocal's hosted checkout (REDIRECT flow, payer chooses card or mobile
 * money there), so Fotizo never handles card details.
 */
export async function createDlocalPayment(input: NewDlocalPayment): Promise<DlocalPayment> {
  const body = await payins(
    "POST",
    "/payments",
    {
      amount: input.amount,
      currency: input.currency,
      country: input.country,
      payment_method_flow: "REDIRECT",
      order_id: input.orderId,
      description: input.description,
      callback_url: input.callbackUrl,
      notification_url: input.notificationUrl,
      payer: {
        name: input.payer.name,
        email: input.payer.email,
        document: input.payer.document,
        ...(input.payer.phone ? { phone: input.payer.phone } : {}),
        user_reference: input.payer.userReference,
      },
    },
    input.orderId,
  );
  return body as DlocalPayment;
}

export const getDlocalPayment = async (id: string) =>
  (await payins("GET", `/payments/${encodeURIComponent(id)}`)) as DlocalPayment;

// ── Refunds ─────────────────────────────────────────────────────────────────

export type DlocalRefund = {
  id: string;
  payment_id?: string;
  status: "PENDING" | "SUCCESS" | "REJECTED" | "CANCELLED" | string;
  status_detail?: string;
  amount?: number;
  currency?: string;
};

export async function createDlocalRefund(input: {
  paymentId: string;
  amount: number;
  currency: string;
  notificationUrl: string;
  idempotencyKey: string;
}): Promise<DlocalRefund> {
  return (await payins(
    "POST",
    "/refunds",
    {
      payment_id: input.paymentId,
      amount: input.amount,
      currency: input.currency,
      notification_url: input.notificationUrl,
    },
    input.idempotencyKey,
  )) as DlocalRefund;
}

// ── Payouts (v3, OAuth) ─────────────────────────────────────────────────────

let token: { value: string; until: number } | null = null;
/** Payout tokens last 180 seconds; one is reused until shortly before then. */
async function payoutsToken() {
  if (token && Date.now() < token.until) return token.value;
  const body = await call(
    `${env.api()}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: env.payoutsClientId(),
        client_secret: env.payoutsClientSecret(),
      }),
    },
    "oauth",
  );
  if (typeof body.access_token !== "string") throw new DlocalError("dLocal did not issue a payouts token.");
  const lifetime = typeof body.expires_in === "number" ? body.expires_in : 180;
  token = { value: body.access_token, until: Date.now() + Math.max(10, lifetime - 30) * 1000 };
  return token.value;
}
/** For tests: forget the cached payouts token. */
export const resetDlocalToken = () => {
  token = null;
};

async function payouts(method: "GET" | "POST", path: string, payload?: unknown) {
  return call(
    `${env.api()}${path}`,
    {
      method,
      headers: {
        "X-Date": new Date().toISOString(),
        "X-Version": "3.0",
        Authorization: `Bearer ${await payoutsToken()}`,
        "Content-Type": "application/json",
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    },
    "payouts",
  );
}

export type DlocalPayout = {
  id: string;
  external_id?: string;
  status: "PENDING" | "PAID" | "REJECTED" | "CANCELLED" | "DELIVERED" | "ON_HOLD" | "ON_HOLD_BY_COMPLIANCE" | string;
  status_detail?: string;
};

export type NewDlocalPayout = {
  externalId: string;
  country: DlocalCountry;
  amount: number;
  currency: string;
  beneficiary:
    | { firstName: string; lastName: string; method: "mobile_money"; walletType: string; phone: string }
    | { firstName: string; lastName: string; method: "bank_transfer"; bankCode: string; account: string };
  notificationUrl: string;
  description: string;
};

export async function createDlocalPayout(input: NewDlocalPayout): Promise<DlocalPayout> {
  const b = input.beneficiary;
  return (await payouts("POST", "/payouts/v3", {
    external_id: input.externalId,
    country: input.country,
    payment_method_id: b.method === "mobile_money" ? "INSTANT_PAYMENT" : "BANK_TRANSFER",
    amount: input.amount,
    currency: input.currency,
    // Sellers are paid for the goods they sold.
    purpose: "PHYSICAL_GOODS",
    flow_type: "B2C",
    description: input.description,
    notification_url: input.notificationUrl,
    beneficiary: {
      first_name: b.firstName,
      last_name: b.lastName,
      ...(b.method === "mobile_money"
        ? { phone: b.phone, instant_payment: { type: b.walletType, id: b.phone } }
        : { bank_account: { branch: b.bankCode, account: b.account } }),
    },
  })) as DlocalPayout;
}

export const getDlocalPayout = async (externalId: string) =>
  (await payouts("GET", `/payouts/v3?external_id=${encodeURIComponent(externalId)}`)) as DlocalPayout;
