import { expect, it } from "vitest";
import { currencyForRegion } from "./currency-region";
it("prefers a recognised country timezone over default English browser settings", () => {
  expect(currencyForRegion("Africa/Accra", ["en-US"])).toBe("GHS");
  expect(currencyForRegion("Europe/London", ["en-US"])).toBe("GBP");
  expect(currencyForRegion("America/New_York", ["en-GB"])).toBe("USD");
});
it("uses explicit browser regions for ambiguous timezones, with a safe fallback", () => {
  expect(currencyForRegion("Africa/Abidjan", ["en-GH"])).toBe("GHS");
  expect(currencyForRegion("UTC", ["en-US"])).toBe("USD");
  expect(currencyForRegion("Europe/Paris", ["fr-FR"])).toBe("GBP");
  expect(currencyForRegion("UTC", ["invalid_", "en"])).toBe("GBP");
});
