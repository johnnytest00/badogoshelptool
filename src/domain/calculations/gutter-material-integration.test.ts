import { describe, expect, it } from "vitest";
import { calculateGutterMaterial } from "./gutter-material";
import { buildGutterDrawingModel, buildGutterTakeoffCandidates, checkGutterMappings, type GutterCatalogVariant } from "./gutter-material-integration";

const input = { gutterStockLengthMm: 4000, runs: [{ id: "a", name: "Bal eresz", lengthMm: 8500, description: "", measurementSource: "site_measurement" as const, roofEdge: null, bracketSpacingMm: null }], downpipes: [{ id: "d", name: "Lefolyó", lengthMm: 5500, commercialLengthMm: 3000, selectedBends: 1, relatedAccessories: [] }], manualComponents: [{ id: "end", category: "end_cap" as const, quantity: 2, note: "" }] };

describe("gutter integration boundary", () => {
  it("builds exact piece candidates without converting linear metres", () => {
    const output = calculateGutterMaterial(input);
    expect(buildGutterTakeoffCandidates(input, output).map((item) => [item.id, item.quantity, item.unit])).toEqual([
      ["gutter-section:a", 3, "piece"], ["downpipe-section:d", 2, "piece"], ["manual:end", 2, "piece"],
    ]);
  });

  it("rejects an incompatible catalog unit and accepts a piece variant", () => {
    const output = calculateGutterMaterial(input);
    const candidates = buildGutterTakeoffCandidates(input, output);
    const variants: GutterCatalogVariant[] = [
      { id: "00000000-0000-4000-8000-000000000001", productId: "00000000-0000-4000-8000-000000000011", productName: "Gutter", category: "gutter", variantName: "4 m", sku: null, purchasingUnit: "linear_meter", lengthMm: 4000, nominalWidthMm: null, effectiveWidthMm: null, technicalSpecs: {}, provenance: "user_provided" },
      { id: "00000000-0000-4000-8000-000000000002", productId: "00000000-0000-4000-8000-000000000012", productName: "Gutter", category: "gutter", variantName: "piece", sku: null, purchasingUnit: "piece", lengthMm: 4000, nominalWidthMm: null, effectiveWidthMm: null, technicalSpecs: {}, provenance: "user_provided" },
    ];
    const checks = checkGutterMappings(candidates, [{ candidateId: candidates[0].id, variantId: variants[0].id }, { candidateId: candidates[1].id, variantId: variants[1].id }], variants);
    expect(checks[0].status).toBe("incompatible");
    expect(checks[1].status).toBe("compatible");
    expect(checks[2].status).toBe("unmapped");
  });

  it("draws independent runs, deterministic section boundaries, and no fabricated relationship", () => {
    const output = calculateGutterMaterial({ ...input, runs: [...input.runs, { ...input.runs[0], id: "b", name: "Jobb eresz", lengthMm: 4000 }] });
    const model = buildGutterDrawingModel({ ...input, runs: [...input.runs, { ...input.runs[0], id: "b", name: "Jobb eresz", lengthMm: 4000 }] }, output, "00000000-0000-4000-8000-000000000099");
    expect(model.sourceRevisionId).toBe("00000000-0000-4000-8000-000000000099");
    expect(model.runs).toHaveLength(2);
    expect(model.runs.map((run) => run.lengthMm)).toEqual([8500, 4000]);
    expect(model.runs[0].sectionBoundaries).toHaveLength(2);
    expect(model.downpipes).toHaveLength(1);
    expect(model.downpipes[0]).toMatchObject({ lengthMm: 5500, commercialLengthMm: 3000, stockSections: 2, selectedBends: 1 });
    expect(model.downpipes[0].sectionBoundaries).toHaveLength(1);
    expect(model.downpipes[0].y).toBeGreaterThan(model.runs[1].y);
    expect(model).not.toHaveProperty("connections");
  });
});
