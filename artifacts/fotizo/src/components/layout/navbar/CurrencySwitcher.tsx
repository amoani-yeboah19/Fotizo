import { ChevronDown } from "lucide-react";
import { useCurrency, CURRENCIES, CurrencyCode } from "@/contexts/CurrencyContext";

// Currency picker. `dropUp` opens the menu above the trigger (for footer placement).
export function CurrencySwitcher({ dropUp = false }: { dropUp?: boolean }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="relative group">
      <button className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors py-2">
        {currency.flag} {currency.code} <ChevronDown className={`w-3 h-3 ${dropUp ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div
        className={`absolute right-0 w-32 bg-white border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 ${
          dropUp ? "bottom-full mb-1" : "top-full"
        }`}
      >
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            onClick={() => setCurrency(c.code as CurrencyCode)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted ${currency.code === c.code ? "font-bold text-primary" : "text-foreground"}`}
          >
            {c.flag} {c.code}
          </button>
        ))}
      </div>
    </div>
  );
}
