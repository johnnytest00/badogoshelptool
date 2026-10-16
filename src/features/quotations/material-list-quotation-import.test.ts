import { describe, expect, it } from "vitest";
import type { MaterialPreparationRevision } from "@/features/material-takeoffs/material-preparation-data";
import type { MaterialProductRecord } from "@/features/materials/material-data";
import { quotationLinesFromMaterialList } from "./material-list-quotation-import";

const revision = (items: unknown[]): MaterialPreparationRevision => ({
  id: "00000000-0000-4000-8000-000000000010", revisionNumber: 4, state: "ready", sourceTakeoffs: [],
  items: items as MaterialPreparationRevision["items"], createdAt: "2026-10-16T00:00:00Z", staleTakeoffIds: [],
});
const products = [{
  id: "00000000-0000-4000-8000-000000000020", organizationId: "00000000-0000-4000-8000-000000000001", manufacturerId: null,
  manufacturerName: null, category: "roof_covering", name: "DEMO fedés", description: null, productCode: null, status: "active",
  provenance: "demo", sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null, createdAt: "", updatedAt: "",
  variants: [{ id: "00000000-0000-4000-8000-000000000030", productId: "00000000-0000-4000-8000-000000000020", name: "DEMO db", sku: null,
    purchasingUnit: "piece", nominalWidthMm: null, effectiveWidthMm: null, thicknessMm: null, lengthMm: null, packagingQuantity: null,
    technicalSpecs: {}, provenance: "demo", sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null,
    prices: [{ id: "00000000-0000-4000-8000-000000000040", amount: 123.5, currency: "HUF", purchasingUnit: "piece", priceKind: "net", priceSource: null, effectiveDate: "2026-10-01", recordedAt: "", provenance: "demo", sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null }], latestPrice: null }],
}] as unknown as MaterialProductRecord[];

describe("quotationLinesFromMaterialList", () => {
  it("imports exact quantities and only a unit-compatible current net price", () => {
    const lines = quotationLinesFromMaterialList(revision([{
      id: "00000000-0000-4000-8000-000000000050", kind: "catalog", productId: "00000000-0000-4000-8000-000000000020",
      variantId: "00000000-0000-4000-8000-000000000030", description: "DEMO fedés", quantity: "12.125", unit: "piece",
      priceSnapshot: { priceId: "00000000-0000-4000-8000-000000000040", amount: "123.50", currency: "HUF", purchasingUnit: "piece", priceKind: "net" }, notes: null,
    }]), products);
    expect(lines[0]).toMatchObject({ type: "MATERIAL", quantity: "12.125", unit: "piece", unitPrice: "123.50", priceId: "00000000-0000-4000-8000-000000000040", sourceMaterialItemId: "00000000-0000-4000-8000-000000000050" });
  });

  it("keeps unknown or incompatible prices blank and preserves manual source rows", () => {
    const lines = quotationLinesFromMaterialList(revision([
      { id: "00000000-0000-4000-8000-000000000051", kind: "manual", description: "Kézi lemez", quantity: "2.5", unit: "linear_meter", notes: null },
      { id: "00000000-0000-4000-8000-000000000052", kind: "catalog", productId: "00000000-0000-4000-8000-000000000020", variantId: "00000000-0000-4000-8000-000000000030", description: "Fedés", quantity: "2", unit: "piece", priceSnapshot: { amount: "88", currency: "HUF", purchasingUnit: "piece", priceKind: "gross" }, notes: null },
    ]), products);
    expect(lines[0]).toMatchObject({ type: "OTHER", unitPrice: "", sourceMaterialItemId: "00000000-0000-4000-8000-000000000051" });
    expect(lines[1]).toMatchObject({ type: "MATERIAL", unitPrice: "", priceId: "", sourceMaterialItemId: "00000000-0000-4000-8000-000000000052" });
    expect(lines.some((line) => line.unitPrice === "0")).toBe(false);
  });
});
