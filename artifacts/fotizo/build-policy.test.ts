import { expect, it } from "vitest";
import { assertSafeBuild } from "./build-policy";
const real = { VITE_USE_MOCKS: "false", VITE_USE_MOCK_SHOP: "false" };
it("accepts a release using real data", () => {
  expect(() => assertSafeBuild("production", real)).not.toThrow();
});
it("rejects release builds with missing or enabled mock defaults", () => {
  for (const env of [
    {},
    { VITE_USE_MOCKS: "false" },
    { ...real, VITE_USE_MOCKS: "true" },
  ]) {
    expect(() => assertSafeBuild("production", env)).toThrow();
  }
});
it("rejects every per-domain mock override and the demo identity picker", () => {
  for (const name of [
    "AUTH",
    "CATALOG",
    "SELLER_CATALOG",
    "ORDERS",
    "MESSAGES",
    "ARTISANS",
    "AUTOS",
    "SUPPORT",
    "SHOP",
  ]) {
    expect(() =>
      assertSafeBuild("production", {
        ...real,
        [`VITE_USE_MOCK_${name}`]: "true",
      }),
    ).toThrow();
  }
  expect(() =>
    assertSafeBuild("production", { ...real, VITE_DEMO_MODE: "true" }),
  ).toThrow();
});
it("permits a separately requested demo build", () => {
  expect(() =>
    assertSafeBuild("demo", { VITE_USE_MOCKS: "true", VITE_DEMO_MODE: "true" }),
  ).not.toThrow();
});
