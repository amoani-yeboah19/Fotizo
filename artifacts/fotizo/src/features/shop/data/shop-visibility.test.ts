import { describe, expect, it } from "vitest";
import { isShopVisible } from "./shop-visibility";
import culturalOffers from "./excluded-cultural-shop-offers.json";
import { loadSourcedCatalogue } from "./sourced-catalogue";

const ornament = (id: string) => ({ id, title: "Car Interior Ornament" });

describe("shop subject exclusions", () => {
  it("excludes symbolic offers from the real sourced catalogue", async () => {
    const rows = await loadSourcedCatalogue();
    const ids = new Set(rows.map((p) => p.id));
    for (const offer of Object.keys(culturalOffers)) {
      expect(ids.has(`1688-${offer}`), offer).toBe(false);
    }
    expect(ids.has("1688-836022061554")).toBe(true);
    expect(ids.has("1688-896758035720")).toBe(true);
  });

  it("removes the screenshot's symbolic ornaments despite generic English titles", () => {
    for (const offer of [
      "831675574981",
      "839250115998",
      "839184867805",
      "839536741988",
      "843019158760",
      "846859098227",
    ]) {
      expect(isShopVisible(ornament(`1688-${offer}`))).toBe(false);
      expect(isShopVisible(ornament(`preview-1688-${offer}`))).toBe(false);
    }
  });

  it("keeps reviewed exclusions hidden under server UUIDs and renamed titles", () => {
    for (const offer of Object.keys(culturalOffers)) {
      expect(
        isShopVisible({
          ...ornament("server-uuid"),
          sourcing: { platform: "1688", productId: offer } as never,
        }),
      ).toBe(false);
      expect(
        isShopVisible({
          ...ornament("server-uuid"),
          images: [`/images/1688-home/${offer}.webp`],
        }),
      ).toBe(false);
    }
  });

  it("catches symbolic subjects on newly named listings", () => {
    for (const title of [
      "Chinese National Flag",
      "Chairman Mao Statue",
      "Mao Zedong Bust",
      "Guanyin Car Ornament",
      "Chinese Dragon Ornament",
      "Pixiu Charm",
      "国旗摆件",
    ]) {
      expect(isShopVisible({ id: "new-offer", title }), title).toBe(false);
    }
    expect(
      isShopVisible({
        ...ornament("new-offer"),
        sourcing: { originalTitle: "车载观音摆件" } as never,
      }),
    ).toBe(false);
  });

  it("retains ordinary products, including photos with Chinese advertising", () => {
    for (const [offer, title] of [
      ["836022061554", "Car Interior Ornament"],
      ["896758035720", "Car Ornament"],
      ["ordinary-key", "Car Key Cover"],
      ["ordinary-seat", "Plastic Disposable Car Seat Covers"],
      ["ordinary-cleaner", "Headlight Restoration Product"],
    ]) {
      expect(
        isShopVisible({
          id: `1688-${offer}`,
          title,
          image: `/images/1688-home/${offer}.webp`,
        }),
        title,
      ).toBe(true);
    }
    expect(
      isShopVisible({ id: "shirt", title: "Mao Collar Shirt Made in China" }),
    ).toBe(true);
  });
});
