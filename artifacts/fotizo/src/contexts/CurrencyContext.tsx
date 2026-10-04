import { browserCurrency } from "./currency-region";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { currencyService } from "@/services";
import type { CurrencyCode, CurrencyMeta, CurrencyRates } from "@/types";

// Re-exported so existing consumers (e.g. the Navbar switcher) keep working.
export type { CurrencyCode } from "@/types";

// Presentation metadata for the currency switcher. Exchange rates are business data
// and come from currencyService (they are NOT hardcoded in the UI).
export const CURRENCIES: CurrencyMeta[] = [
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "GHS", symbol: "₵", name: "Ghana Cedi", flag: "🇬🇭" },
];

function validRates(rates: CurrencyRates): boolean {
  return (
    rates?.GBP === 1 &&
    [rates.USD, rates.GHS].every(
      (rate) => typeof rate === "number" && Number.isFinite(rate) && rate > 0,
    )
  );
}

interface CurrencyContextType {
  currency: CurrencyMeta;
  availableCurrencies: CurrencyMeta[];
  ratesStatus: "loading" | "ready" | "error";
  retryRates: () => void;
  setCurrency: (code: CurrencyCode) => void;
  format: (amountGBP: number) => string;
  convert: (amountGBP: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem("fotizo_currency");
      return (
        CURRENCIES.find((c) => c.code === saved)?.code ?? browserCurrency()
      );
    } catch {
      return browserCurrency();
    }
  });
  const [rates, setRates] = useState<CurrencyRates | null>(null);

  const [ratesStatus, setRatesStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const retryRates = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setRatesStatus("loading");
    currencyService
      .getRates()
      .then((r) => {
        if (!validRates(r)) throw new Error("Invalid exchange rates");
        if (active) {
          setRates(r);
          setRatesStatus("ready");
        }
      })
      .catch(() => {
        if (active) {
          setRates(null);
          setRatesStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (ratesStatus !== "error") return;
    window.addEventListener("online", retryRates);
    window.addEventListener("focus", retryRates);
    return () => {
      window.removeEventListener("online", retryRates);
      window.removeEventListener("focus", retryRates);
    };
  }, [ratesStatus, retryRates]);

  const effectiveCode = rates ? currencyCode : "GBP";
  const availableCurrencies = rates ? CURRENCIES : [CURRENCIES[0]];
  const currency = useMemo(
    () => CURRENCIES.find((c) => c.code === effectiveCode)!,
    [effectiveCode],
  );

  const setCurrency = useCallback((code: CurrencyCode) => {
    if (!CURRENCIES.some((c) => c.code === code)) return;
    setCurrencyCode(code);
    try {
      localStorage.setItem("fotizo_currency", code);
    } catch {
      /* Storage can be disabled. */
    }
  }, []);

  const convert = useCallback(
    (amountGBP: number) =>
      Math.round(amountGBP * (rates?.[effectiveCode] ?? 1) * 100) / 100,
    [rates, effectiveCode],
  );

  const format = useCallback(
    (amountGBP: number) => {
      const amount = convert(amountGBP);
      return `${currency.symbol}${amount.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [convert, currency],
  );

  const value = useMemo(
    () => ({
      currency,
      availableCurrencies,
      setCurrency,
      format,
      convert,
      ratesStatus,
      retryRates,
    }),
    [currency, rates, setCurrency, format, convert, ratesStatus, retryRates],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
