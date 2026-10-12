import { describe, expect, it } from "vitest";
import { hasRelevantMaterialSpecificationChanged, mapCatalogVariantToSheetLayout, resolveSheetLayoutMaterial } from "./sheet-layout-material";

const variant = {
  id: "00000000-0000-4000-8000-000000000082",
  productName: "DEMO fedőanyag",
  name: "DEMO változat",
  sku: null,
  purchasingUnit: "square_meter" as const,
  effectiveWidthMm: 1000,
  nominalWidthMm: 1100,
  technicalSpecs: { minimum_sheet_length_mm: "500", maximum_sheet_length_mm: "12000", end_allowance_mm: "20" },
  provenance: "demo" as const,
  sourceName: null,
  sourceUrl: null,
  sourceDate: null,
  sourceNotes: null,
};

describe("sheet layout material mapping", () => {
  it("maps only explicitly supported catalog properties", () => {
    const mapped = mapCatalogVariantToSheetLayout({ ...variant, technicalSpecs: { ...variant.technicalSpecs, overlap_mm: "99" } });
    expect(mapped).toMatchObject({ effectiveCoveringWidthMm: 1000, nominalSheetWidthMm: 1100, minimumSheetLengthMm: 500, maximumSheetLengthMm: 12000, endAllowanceMm: 20 });
    expect(mapped).not.toHaveProperty("overlapMm");
  });

  it("uses explicit overrides and preserves parameter provenance", () => {
    const catalog = mapCatalogVariantToSheetLayout(variant);
    const result = resolveSheetLayoutMaterial(catalog, { effectiveCoveringWidthMm: 1250, endAllowanceMm: 30 });
    expect(result.values.effectiveCoveringWidthMm).toBe(1250);
    expect(result.values.nominalSheetWidthMm).toBe(1100);
    expect(result.parameterSources.effectiveCoveringWidthMm).toBe("user_provided");
    expect(result.parameterSources.nominalSheetWidthMm).toBe("catalog");
    expect(result.catalogSnapshot.effectiveCoveringWidthMm).toBe(1000);
  });

  it("never infers effective width from nominal width", () => {
    const catalog = mapCatalogVariantToSheetLayout({ ...variant, effectiveWidthMm: null });
    expect(() => resolveSheetLayoutMaterial(catalog, {})).toThrow("hasznos fedési szélesség hiányzik");
  });

  it("detects relevant specification changes but ignores descriptive fields", () => {
    const snapshot = mapCatalogVariantToSheetLayout(variant);
    expect(hasRelevantMaterialSpecificationChanged(snapshot, { ...snapshot, variantName: "Átnevezett" })).toBe(false);
    expect(hasRelevantMaterialSpecificationChanged(snapshot, { ...snapshot, effectiveCoveringWidthMm: 900 })).toBe(true);
  });
});
