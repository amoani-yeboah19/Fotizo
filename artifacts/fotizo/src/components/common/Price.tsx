import { memo } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";

// Currency-aware price. Uses the active currency's format() so every price on the site
// responds to the GBP/USD/GHS switcher. Callers style the wrapper via className.
export const Price = memo(function Price({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  const { format } = useCurrency();
  return <span className={className}>{format(amount)}</span>;
});
