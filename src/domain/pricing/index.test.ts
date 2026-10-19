import { describe, expect, it } from "vitest";
import { buildPriceOptions, defaultPrice, priceChoiceLabel, priceDifference, pricedLineAmount, selectablePrices, validatePriceUnit, type PriceLine } from ".";

const price = (id: string, optionId: string | null, amount: number, date = "2026-01-01", sourceName: string | null = null): PriceLine =>
  ({ id, optionId, amount, currency: "HUF", purchasingUnit: "square_meter", priceKind: "net", effectiveDate: date, recordedAt: `${date}T00:00:00Z`, provenance: "demo", sourceName });
const options = [{ id: "o1", label: "Lindab", status: "active" as const }, { id: "o2", label: "Helyi tüzép", status: "active" as const }, { id: "o3", label: "Régi", status: "archived" as const }];

describe("price options", () => {
  const prices = [price("a", "o1", 3000, "2026-01-01", "Lindab"), price("b", "o1", 3200, "2026-02-01", "Lindab"), price("c", "o2", 2950, "2026-01-05", "Helyi tüzép"), price("d", "o3", 1, "2026-01-01", "Régi"), price("e", null, 9999)];
  const built = buildPriceOptions(prices, options);
  it("keeps per-option history and picks the newest as current", () => {
    expect(built.find((o) => o.id === "o1")?.current?.id).toBe("b");
    expect(built.find((o) => o.id === "o1")?.prices.map((p) => p.id)).toEqual(["b", "a"]);
    expect(built[0]?.label).toBe("Alap ár");
  });
  it("offers only active options and never auto-selects among several (not the cheapest either)", () => {
    expect(selectablePrices(built, "square_meter").map((p) => p.id)).toEqual(["e", "c", "b"]);
    expect(defaultPrice(built, "square_meter")).toBeNull();
  });
  it("pre-selects a lone price and labels it with its supplier", () => {
    const single = buildPriceOptions([price("b", "o1", 3200, "2026-02-01", "Lindab")], options);
    expect(defaultPrice(single, "square_meter")?.id).toBe("b");
    expect(priceChoiceLabel(single.find((o) => o.id === "o1")!.current!)).toMatch(/^Lindab — 3\s?200 Ft\/m² · nettó$/);
  });
  it("compares only like with like and validates units", () => {
    expect(priceDifference(prices[2]!, prices[1]!)).toBe(-250);
    expect(priceDifference(prices[2]!, { ...prices[1]!, priceKind: "gross" })).toBeNull();
    expect(validatePriceUnit("piece", "square_meter")).toContain("nem egyezik");
    expect(validatePriceUnit("piece", "piece")).toBeNull();
  });
  it("computes exact line amounts", () => {
    expect(pricedLineAmount("116.461896", "1500")).toBe("174692.84");
    expect(pricedLineAmount("x", "1")).toBeNull();
  });
});
