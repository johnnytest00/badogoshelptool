import { describe, expect, it } from "vitest";
import { quotationLineSchema } from "@/domain/quotations/contracts";
import { catalogReplacementNeedsConfirmation, changeQuotationMaterialCategory, quotationMaterialLinkState, quotationPricesEqual, quotationPurchasingUnitLabel, quotationPurchasingUnitsMatch } from "./quotation-material-state";

const line = (patch: Record<string, unknown> = {}) => quotationLineSchema.parse({
  type: "MATERIAL", description: "Kézi tetőléc", quantity: "4.5", unit: "linear_meter", unitPrice: "1200.00", priceClass: "net",
  variantId: "", categoryId: "00000000-0000-4000-8000-000000000011", priceId: "", sourceMaterialItemId: "", takeoffItemId: "", notes: "",
  ...patch,
});

describe("quotation material state", () => {
  it("distinguishes catalog-linked, manual and unmapped source materials", () => {
    expect(quotationMaterialLinkState(line({ variantId: "00000000-0000-4000-8000-000000000031" }))).toBe("catalog_linked");
    expect(quotationMaterialLinkState(line())).toBe("manual");
    expect(quotationMaterialLinkState(line({ sourceMaterialItemId: "00000000-0000-4000-8000-000000000051" }))).toBe("source_unmapped");
  });

  it("clears only an incompatible catalog link and keeps quote and source values", () => {
    const linked = line({
      description: "Eredeti kézi leírás", variantId: "00000000-0000-4000-8000-000000000031",
      priceId: "00000000-0000-4000-8000-000000000041", priceProvenance: "catalog_snapshot",
      sourceMaterialItemId: "00000000-0000-4000-8000-000000000051",
    });
    expect(changeQuotationMaterialCategory(linked, "00000000-0000-4000-8000-000000000012", "00000000-0000-4000-8000-000000000011")).toMatchObject({
      description: "Eredeti kézi leírás", quantity: "4.5", unit: "linear_meter", unitPrice: "1200.00",
      categoryId: "00000000-0000-4000-8000-000000000012", variantId: "", priceId: "",
      priceProvenance: "catalog_snapshot", sourceMaterialItemId: "00000000-0000-4000-8000-000000000051",
    });
  });

  it("keeps manual or unmapped material details when its category changes", () => {
    const manual = line({ sourceMaterialItemId: "00000000-0000-4000-8000-000000000051", priceProvenance: "user_entered" });
    expect(changeQuotationMaterialCategory(manual, "00000000-0000-4000-8000-000000000012", null)).toMatchObject({
      description: "Kézi tetőléc", quantity: "4.5", unit: "linear_meter", unitPrice: "1200.00",
      sourceMaterialItemId: "00000000-0000-4000-8000-000000000051", priceProvenance: "user_entered",
    });
  });

  it("requires confirmation only when an explicit catalog choice replaces a non-empty unit or price", () => {
    const current = line();
    expect(catalogReplacementNeedsConfirmation(current, "piece")).toBe(true);
    expect(catalogReplacementNeedsConfirmation({ ...current, unit: "m" }, "linear_meter")).toBe(false);
    expect(catalogReplacementNeedsConfirmation(current, "linear_meter", "1250.00")).toBe(true);
    expect(catalogReplacementNeedsConfirmation({ ...current, unit: "", unitPrice: "" }, "piece", "1250.00")).toBe(false);
    expect(catalogReplacementNeedsConfirmation(current, "linear_meter", "1200,00")).toBe(false);
  });

  it("shows known catalog unit codes using their human-readable labels", () => {
    expect(quotationPurchasingUnitLabel("linear_meter")).toBe("m");
    expect(quotationPurchasingUnitLabel("mystery_unit")).toBe("mystery_unit");
    expect(quotationPurchasingUnitsMatch("m", "linear_meter")).toBe(true);
    expect(quotationPurchasingUnitsMatch("m", "piece")).toBe(false);
  });

  it("compares prices as decimal amounts rather than formatted strings", () => {
    expect(quotationPricesEqual("3500.5", "3500.50")).toBe(true);
    expect(quotationPricesEqual("3500,50", "3500.51")).toBe(false);
    expect(quotationPricesEqual("invalid", "3500.50")).toBe(false);
    expect(catalogReplacementNeedsConfirmation({ ...line({ unit: "m", unitPrice: "3500.5" }) }, "linear_meter", "3500.50")).toBe(false);
    expect(catalogReplacementNeedsConfirmation({ ...line({ unit: "m", unitPrice: "3500.5" }) }, "linear_meter", "3500.51")).toBe(true);
  });
});
