import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

const IDENTITY_RATES: CurrencyRates = { GBP: 1, USD: 1, GHS: 1 };

interface CurrencyContextType {
  currency: CurrencyMeta;
  setCurrency: (code: CurrencyCode) => void;
  format: (amountGBP: number) => string;
  convert: (amountGBP: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    return (localStorage.getItem("fotizo_currency") as CurrencyCode) || "GBP";
  });
  const [rates, setRates] = useState<CurrencyRates>(IDENTITY_RATES);

  useEffect(() => {
    let active = true;
    currencyService.getRates().then((r) => {
      if (active) setRates(r);
    });
    return () => {
      active = false;
    };
  }, []);

  const currency = CURRENCIES.find((c) => c.code === currencyCode)!;

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyCode(code);
    localStorage.setItem("fotizo_currency", code);
  };

  const convert = (amountGBP: number) => {
    return Math.round(amountGBP * (rates[currencyCode] ?? 1) * 100) / 100;
  };

  const format = (amountGBP: number) => {
    const amount = convert(amountGBP);
    return `${currency.symbol}${amount.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
