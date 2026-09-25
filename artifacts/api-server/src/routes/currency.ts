import { Router, type IRouter } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Display conversion only: prices are stored and charged in GBP. The source is
// configurable; the default is ExchangeRate-API's open endpoint (no key).
const sourceUrl = () =>
  process.env.CURRENCY_RATES_URL ?? "https://open.er-api.com/v6/latest/GBP";
const FRESH_MS = 6 * 60 * 60 * 1000;
// Beyond this age a cached rate is too old to show; the client keeps GBP.
const STALE_LIMIT_MS = 48 * 60 * 60 * 1000;

const sourceSchema = z.object({
  rates: z.object({
    USD: z.number().positive().finite(),
    GHS: z.number().positive().finite(),
  }),
});

type Rates = { GBP: 1; USD: number; GHS: number };
let cached: { rates: Rates; fetchedAt: number } | undefined;
let inFlight: Promise<void> | undefined;

async function refresh(): Promise<void> {
  const response = await fetch(sourceUrl(), {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Rate source returned ${response.status}`);
  const { rates } = sourceSchema.parse(await response.json());
  cached = { rates: { GBP: 1, USD: rates.USD, GHS: rates.GHS }, fetchedAt: Date.now() };
}

export async function currentRates(now = Date.now()): Promise<Rates | null> {
  if (!cached || now - cached.fetchedAt > FRESH_MS) {
    inFlight ??= refresh()
      .catch((error: unknown) =>
        logger.warn(
          { errorType: (error as Error)?.name },
          "Currency rate refresh failed",
        ),
      )
      .finally(() => {
        inFlight = undefined;
      });
    await inFlight;
  }
  return cached && now - cached.fetchedAt <= STALE_LIMIT_MS ? cached.rates : null;
}

export function resetCurrencyCache(): void {
  cached = undefined;
}

router.get("/currency/rates", async (_req, res) => {
  const rates = await currentRates();
  if (!rates) {
    res.status(503).json({ error: "Exchange rates are unavailable." });
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=900");
  res.json(rates);
});

export default router;
