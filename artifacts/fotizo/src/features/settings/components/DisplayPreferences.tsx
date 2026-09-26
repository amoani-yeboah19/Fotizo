import { useCurrency } from "@/contexts/CurrencyContext";
export function DisplayPreferences() {
  const { currency, availableCurrencies, setCurrency } = useCurrency();
  return (
    <section
      id="preferences"
      className="scroll-mt-28 rounded-2xl border bg-card p-6 sm:p-8 space-y-4"
    >
      <h2 className="text-xl font-semibold">Display preferences</h2>
      <div className="space-y-2">
        <label htmlFor="settings-currency" className="text-sm font-medium">
          Display currency
        </label>
        <select
          id="settings-currency"
          value={currency.code}
          onChange={(event) => {
            const selected = availableCurrencies.find(
              (item) => item.code === event.target.value,
            );
            if (selected) setCurrency(selected.code);
          }}
          className="h-11 w-full max-w-sm rounded-md border bg-background px-3 text-sm"
        >
          {availableCurrencies.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name} ({item.code})
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          Applies to prices throughout Fotizo on this browser. Your checkout
          shows the final payment currency.
        </p>
      </div>
    </section>
  );
}
