import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
  useCurrency,
  CurrencyCode,
  CURRENCIES,
} from "@/contexts/CurrencyContext";

// Currency picker. Click-toggled (hover menus don't work on touch devices).
// `dropUp` opens the menu above the trigger (for footer placement).
export function CurrencySwitcher({ dropUp = false }: { dropUp?: boolean }) {
  const {
    currency,
    setCurrency,
    availableCurrencies,
    ratesStatus,
    retryRates,
  } = useCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close when tapping/clicking anywhere outside.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Change currency, currently ${currency.name}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors py-2"
      >
        {currency.flag} {currency.code}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open !== dropUp ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          className={`absolute right-0 w-64 bg-white border border-border rounded-lg shadow-lg py-2 z-50 ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div role="listbox" aria-label="Currency">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                role="option"
                disabled={
                  !availableCurrencies.some(
                    (available) => available.code === c.code,
                  )
                }
                aria-selected={currency.code === c.code}
                onClick={() => {
                  setCurrency(c.code as CurrencyCode);
                  setOpen(false);
                }}
                className={`disabled:opacity-50 disabled:cursor-not-allowed w-full text-left px-4 py-2 text-sm hover:bg-muted ${
                  currency.code === c.code
                    ? "font-bold text-primary"
                    : "text-foreground"
                }`}
              >
                {c.flag} {c.code} · {c.name}
              </button>
            ))}
          </div>
          {ratesStatus === "loading" && (
            <p
              className="px-4 py-2 text-xs text-muted-foreground"
              role="status"
            >
              Loading exchange rates…
            </p>
          )}
          {ratesStatus === "error" && (
            <div className="border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground" role="status">
                Exchange rates could not load. Prices are shown in GBP.
              </p>
              <button
                type="button"
                onClick={retryRates}
                className="mt-2 text-sm font-semibold text-primary underline"
              >
                Retry exchange rates
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
