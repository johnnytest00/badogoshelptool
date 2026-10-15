import { describe, expect, it } from "vitest";
import { aggregateMaterialRequirements, type MaterialSourceTakeoff } from "./aggregation";

const source = (overrides: Partial<MaterialSourceTakeoff> & Pick<MaterialSourceTakeoff, "id" | "status" | "items">): MaterialSourceTakeoff => ({
  id: overrides.id, name: overrides.name ?? `DEMO ${overrides.id}`, status: overrides.status, version: overrides.version ?? 1,
  sourceCalculationId: overrides.sourceCalculationId ?? `calc-${overrides.id}`,
  sourceRevisionId: overrides.sourceRevisionId ?? `revision-${overrides.id}`,
  sourceCurrentRevisionId: overrides.sourceCurrentRevisionId ?? overrides.sourceRevisionId ?? `revision-${overrides.id}`,
  items: overrides.items,
});
const item = (id: string, overrides: Partial<MaterialSourceTakeoff["items"][number]> = {}) => ({
  id, variantId: "variant-a", quantity: "1.25", unit: "piece",
  materialSnapshot: { productId: "product-a", productName: "DEMO ereszszál", productCategory: "gutter", variantId: "variant-a", variantName: "DEMO 4000 mm", lengthMm: 4000, nominalWidthMm: 125, technicalSpecs: { color: "barna", coating: "DEMO" } },
  priceSnapshot: { id: "price-a", amount: "1250.00", currency: "HUF", purchasingUnit: "piece", priceKind: "net" as const, effectiveDate: "2026-10-01" },
  ...overrides,
});

describe("aggregateMaterialRequirements", () => {
  it("aggregates compatible approved sources exactly and keeps source revisions", () => {
    const result = aggregateMaterialRequirements([
      source({ id: "takeoff-a", status: "approved", items: [item("item-a")] }),
      source({ id: "takeoff-b", status: "approved", sourceRevisionId: "revision-b", items: [item("item-b", { quantity: "2.5" })] }),
    ], ["takeoff-a", "takeoff-b"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ quantity: "3.75", unit: "piece", priceState: "consistent", priceId: "price-a" });
    expect(result[0].sources.map((row) => [row.itemId, row.calculationRevisionId])).toEqual([["item-a", "revision-takeoff-a"], ["item-b", "revision-b"]]);
  });

  it("keeps sheet lengths, units, technical specifications, and different products separate", () => {
    const base = item("base");
    const result = aggregateMaterialRequirements([source({ id: "takeoff", status: "approved", items: [
      base,
      item("longer", { materialSnapshot: { ...base.materialSnapshot as object, lengthMm: 5000 } }),
      item("meter", { unit: "linear_meter" }),
      item("spec", { materialSnapshot: { ...base.materialSnapshot as object, technicalSpecs: { color: "piros", coating: "DEMO" } } }),
      item("product", { materialSnapshot: { ...base.materialSnapshot as object, productId: "product-b" } }),
    ] })], ["takeoff"]);
    expect(result).toHaveLength(5);
    expect(result.map((row) => row.quantity)).toEqual(["1.25", "1.25", "1.25", "1.25", "1.25"]);
  });

  it("does not count the same item twice, unselected sources, or unapproved takeoffs", () => {
    const duplicated = source({ id: "approved", status: "approved", items: [item("same")] });
    const result = aggregateMaterialRequirements([duplicated, duplicated, source({ id: "draft", status: "draft", items: [item("draft-item")] }), source({ id: "other", status: "approved", items: [item("other-item")] })], ["approved"]);
    expect(result).toHaveLength(1);
    expect(result[0]?.sources).toHaveLength(1);
    expect(result[0]?.quantity).toBe("1.25");
  });

  it("marks missing and mixed catalog price snapshots without substituting a price", () => {
    const result = aggregateMaterialRequirements([source({ id: "takeoff", status: "approved", items: [
      item("missing", { priceSnapshot: null }),
      item("priced", { priceSnapshot: { id: "p2", amount: "1300.00", currency: "HUF", purchasingUnit: "piece", priceKind: "net" } }),
    ] })], ["takeoff"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ priceState: "missing", unitPrice: null, priceId: null });
    const mixed = aggregateMaterialRequirements([source({ id: "mixed", status: "approved", items: [
      item("first", { priceSnapshot: { id: "p1", amount: "1250", currency: "HUF", purchasingUnit: "piece", priceKind: "net" } }),
      item("second", { priceSnapshot: { id: "p2", amount: "1300", currency: "HUF", purchasingUnit: "piece", priceKind: "net" } }),
    ] })], ["mixed"]);
    expect(mixed[0]).toMatchObject({ priceState: "mixed", unitPrice: null, priceId: null });
  });

  it("rejects malformed source quantities rather than rounding them", () => {
    expect(() => aggregateMaterialRequirements([source({ id: "takeoff", status: "approved", items: [item("bad", { quantity: "1.0000001" })] })], ["takeoff"])).toThrow("legfeljebb 6 tizedesjegyű");
  });
});
