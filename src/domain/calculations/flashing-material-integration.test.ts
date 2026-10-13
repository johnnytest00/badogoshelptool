import { describe, expect, it } from "vitest";
import { calculateFlashingMaterial, type FlashingMaterialInput } from "./flashing-material";
import { buildFlashingDrawingModel, buildFlashingTakeoffCandidates, checkFlashingMappings, type FlashingCatalogVariant } from "./flashing-material-integration";

const demo = { kind: "demo" as const, label: "DEMO integrációs tesztadat", sourceUrl: null, sourceDate: null, catalogVariantId: null, manuallyOverridden: false };
const base: FlashingMaterialInput = {
  sectionSpec: { nominalLengthMm: 2000, nominalLengthSource: demo, connection: { mode: "explicit_overlap", overlapMm: 100, source: demo } },
  runs: [{ id: "run-a", category: "verge", name: "DEMO oromél", lengthMm: 3900, lengthSource: "demo", roofEdgeReference: null, startExtensionMm: 100, endExtensionMm: 0, reserveMm: 100, installationNotes: [] }],
  manualComponents: [{ id: "clip", category: "custom", name: "DEMO kézi kapocs", quantity: 2, note: "DEMO", source: demo }],
};

const variants: FlashingCatalogVariant[] = [
  { id: "00000000-0000-4000-8000-000000000001", productId: "00000000-0000-4000-8000-000000000011", productName: "DEMO flashing", productCategory: "flashing", productStatus: "active", manufacturerName: null, productCode: null, variantName: "DEMO darab", sku: null, purchasingUnit: "piece", lengthMm: 2000, nominalWidthMm: null, effectiveWidthMm: null, thicknessMm: null, packagingQuantity: null, technicalSpecs: {}, provenance: "demo", sourceName: "DEMO", sourceUrl: null, sourceDate: null, sourceNotes: null, latestPrice: null },
  { id: "00000000-0000-4000-8000-000000000002", productId: "00000000-0000-4000-8000-000000000012", productName: "DEMO folyóméter", productCategory: "flashing", productStatus: "active", manufacturerName: null, productCode: null, variantName: "DEMO fm", sku: null, purchasingUnit: "linear_meter", lengthMm: null, nominalWidthMm: null, effectiveWidthMm: null, thicknessMm: null, packagingQuantity: null, technicalSpecs: {}, provenance: "user_provided", sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null, latestPrice: { id: "00000000-0000-4000-8000-000000000021", amount: 12, currency: "HUF", purchasingUnit: "linear_meter", priceKind: "net", effectiveDate: "2026-10-13", provenance: "demo", sourceName: "DEMO", sourceUrl: null } },
];

describe("flashing material integration", () => {
  it("offers all six categories as explicit section counts and separately explicit linear lengths", () => {
    const input = { ...base, runs: ["verge", "wall", "eaves", "ridge", "valley", "custom"].map((category, index) => ({ ...base.runs[0]!, id: `run-${index}`, category: category as FlashingMaterialInput["runs"][number]["category"] })) };
    const candidates = buildFlashingTakeoffCandidates(input, calculateFlashingMaterial(input));
    expect(candidates.filter((item) => item.id.startsWith("run-piece:")).map((item) => item.category)).toEqual(input.runs.map((run) => run.category));
    expect(candidates.filter((item) => item.id.startsWith("run-linear:")).every((item) => item.unit === "linear_meter" && item.method === "linear")).toBe(true);
    expect(candidates.filter((item) => item.id.startsWith("run-piece:")).every((item) => item.unit === "piece" && item.method === "manual")).toBe(true);
  });

  it("never maps a null section count to zero, but retains the explicit planning-length option", () => {
    const input = { ...base, sectionSpec: { ...base.sectionSpec, connection: { mode: "unknown" as const } } };
    const candidates = buildFlashingTakeoffCandidates(input, calculateFlashingMaterial(input));
    expect(candidates.map((item) => item.id)).not.toContain("run-piece:run-a");
    expect(candidates.find((item) => item.id === "run-linear:run-a")).toMatchObject({ quantity: 4.1, unit: "linear_meter" });
    expect(candidates.find((item) => item.id === "run-linear:run-a")?.warning).toContain("darabszám nem számítható");
  });

  it("rejects incompatible units/categories and retains price and catalog provenance for compatible options", () => {
    const input = { ...base, runs: [base.runs[0]!] };
    const candidates = buildFlashingTakeoffCandidates(input, calculateFlashingMaterial(input));
    const piece = candidates.find((item) => item.id === "run-piece:run-a")!;
    const linear = candidates.find((item) => item.id === "run-linear:run-a")!;
    expect(checkFlashingMappings([piece], [{ candidateId: piece.id, variantId: variants[1]!.id }], variants)[0]?.status).toBe("incompatible");
    expect(checkFlashingMappings([linear], [{ candidateId: linear.id, variantId: variants[0]!.id }], variants)[0]?.status).toBe("incompatible");
    const compatible = checkFlashingMappings([linear], [{ candidateId: linear.id, variantId: variants[1]!.id }], variants)[0];
    expect(compatible?.status).toBe("compatible");
    expect(compatible?.variant?.latestPrice?.id).toBe("00000000-0000-4000-8000-000000000021");
    expect(checkFlashingMappings([linear], [{ candidateId: linear.id, variantId: variants[1]!.id }], [{ ...variants[1]!, productCategory: "sheet_metal" }])[0]?.status).toBe("compatible");
    expect(checkFlashingMappings([linear], [{ candidateId: linear.id, variantId: variants[1]!.id }], [{ ...variants[1]!, productStatus: "archived" }])[0]?.status).toBe("incompatible");
  });

  it("draws exact coverage, reserve, extensions, section boundaries, overlap and source revision without invented topology", () => {
    const geometryInput: FlashingMaterialInput = { ...base, runs: [{ ...base.runs[0]!, lengthSource: "geometry", roofEdgeReference: { roofModelId: "00000000-0000-4000-8000-000000000031", roofModelRevisionId: "00000000-0000-4000-8000-000000000032", calculationId: "00000000-0000-4000-8000-000000000033", calculationRevisionId: "00000000-0000-4000-8000-000000000034", edgeId: "left-front-gable", outputField: "lengths.eachSlopingGableEdgeMm", suggestedLengthMm: 3900, lengthOverridden: false } }] };
    const output = calculateFlashingMaterial(geometryInput);
    const model = buildFlashingDrawingModel(geometryInput, output, "00000000-0000-4000-8000-000000000041");
    expect(model).toMatchObject({ width: 960, sourceRevisionId: "00000000-0000-4000-8000-000000000041", connectionMode: "explicit_overlap" });
    expect(model.rows[0]).toMatchObject({ targetMm: 4100, requiredMm: 4000, reserveMm: 100, lengthMm: 3900, startExtensionMm: 100, endExtensionMm: 0, sectionCount: 3, boundaryMm: [1900, 3800], overlapBands: [{ startMm: 1900, endMm: 2000 }, { startMm: 3800, endMm: 3900 }], source: { edgeId: "left-front-gable", calculationRevisionId: "00000000-0000-4000-8000-000000000034" } });
    expect(model).not.toHaveProperty("roofTopology");
  });

  it("does not draw inferred section boundaries for an unknown connection", () => {
    const input = { ...base, sectionSpec: { ...base.sectionSpec, connection: { mode: "unknown" as const } } };
    const model = buildFlashingDrawingModel(input, calculateFlashingMaterial(input), "DEMO-revision");
    expect(model.rows[0]).toMatchObject({ sectionCount: null, boundaryMm: [], overlapBands: [], overlapMm: null, effectiveAdvanceMm: null });
  });
});
