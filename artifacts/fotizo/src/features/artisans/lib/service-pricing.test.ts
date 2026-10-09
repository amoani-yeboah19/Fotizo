import { expect, it } from "vitest";
import { servicePrice } from "./service-pricing";
it("converts dollar input to the API base and existing base prices back to dollars", () => {
  expect(servicePrice(125, 1.25, "to-base")).toBe(100);
  expect(servicePrice(100, 1.25, "to-usd")).toBe(125);
  expect(servicePrice(29.99, 1.25, "to-base")).toBe(23.99);
});
it("never assumes an exchange rate when it is missing or invalid", () => {
  for (const rate of [0, -1, NaN, Infinity]) expect(() => servicePrice(100, rate, "to-base")).toThrow();
});
