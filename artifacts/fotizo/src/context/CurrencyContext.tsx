import { createContext, useContext, useState, ReactNode } from "react";

export type CurrencyCode = "GBP" | "USD" | "GHS";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rate: number;
}

export const CURRENCIES: Currency[] = [
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧", rate: 1 },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸", rate: 1.27 },
  { code: "GHS", symbol: "₵", name: "Ghana Cedi", flag: "🇬🇭", rate: 18.5 },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (code: CurrencyCode) => void;
  format: (amountGBP: number) => string;
  convert: (amountGBP: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    return (localStorage.getItem("fotizo_currency") as CurrencyCode) || "GBP";
  });

  const currency = CURRENCIES.find((c) => c.code === currencyCode)!;

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyCode(code);
    localStorage.setItem("fotizo_currency", code);
  };

  const convert = (amountGBP: number) => {
    return Math.round(amountGBP * currency.rate * 100) / 100;
  };

  const format = (amountGBP: number) => {
    const amount = convert(amountGBP);
    return `${currency.symbol}${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
