import type { CurrencyCode } from "@/types";

// Best-effort browser region, not IP geolocation. Do not request precise location.
export function currencyForRegion(
  timeZone: string,
  languages: readonly string[],
): CurrencyCode {
  if (timeZone === "Africa/Accra") return "GHS";
  if (["Europe/London", "Europe/Belfast"].includes(timeZone)) return "GBP";
  if (
    /^America\/(New_York|Chicago|Denver|Los_Angeles|Anchorage|Phoenix|Detroit|Adak|Indiana\/|Kentucky\/|North_Dakota\/)/.test(
      timeZone,
    ) ||
    timeZone === "Pacific/Honolulu"
  )
    return "USD";
  for (const language of languages) {
    try {
      const region = new Intl.Locale(language).region;
      if (region === "GH") return "GHS";
      if (region === "GB") return "GBP";
      if (region === "US") return "USD";
    } catch {
      /* Ignore malformed language preferences. */
    }
  }
  return "GBP";
}
export function browserCurrency(): CurrencyCode {
  try {
    return currencyForRegion(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.languages ?? [navigator.language],
    );
  } catch {
    return "GBP";
  }
}
