import { describe, expect, it } from "vitest";
import { materialPriceInputSchema, materialProductInputSchema, materialVariantInputSchema, parseOptionalNumber } from "./contracts";

describe("material contracts", () => {
  it("accepts known product data and preserves missing optional values", () => {
    const result = materialProductInputSchema.parse({ name: "DEMO lemez", category: "sheet_metal", manufacturerId: null, dataProvenance: "demo" });
    expect(result.description).toBe("");
    expect(result.manufacturerId).toBeNull();
  });

  it("rejects invalid price and technical specification data", () => {
    expect(materialPriceInputSchema.safeParse({ variantId: "00000000-0000-0000-0000-000000000001", amount: -1, purchasingUnit: "piece", priceKind: "net", effectiveDate: "2026-01-01", dataProvenance: "user_provided" }).success).toBe(false);
    expect(materialVariantInputSchema.safeParse({ productId: "00000000-0000-0000-0000-000000000001", name: "x", purchasingUnit: "piece", technicalSpecs: [], dataProvenance: "user_provided" }).success).toBe(false);
  });

  it("parses Hungarian decimal input without turning empty into zero", () => {
    const form = new FormData();
    form.set("value", "12,50");
    expect(parseOptionalNumber(form.get("value"))).toBe(12.5);
    expect(parseOptionalNumber(null)).toBeNull();
  });
});
