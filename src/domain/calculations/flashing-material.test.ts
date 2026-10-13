import { describe, expect, it } from "vitest";
import { executeCalculator } from "@/domain/calculations/engine";
import { createProductionCalculatorRegistry } from "./registry";
import {
  calculateFlashingMaterial,
  FLASHING_MATERIAL_CALCULATOR_ID,
  flashingMaterialCalculator,
  type FlashingMaterialInput,
} from "./flashing-material";

const provenance = { kind: "demo" as const, label: "DEMO matematikai tesztadat", sourceUrl: null, sourceDate: null, catalogVariantId: null, manuallyOverridden: false };
const base: FlashingMaterialInput = {
  sectionSpec: { nominalLengthMm: 2000, nominalLengthSource: provenance, connection: { mode: "no_overlap_confirmed", source: provenance } },
  runs: [{ id: "run-1", category: "verge", name: "DEMO oromél", lengthMm: 2000, lengthSource: "demo", roofEdgeReference: null, startExtensionMm: 0, endExtensionMm: 0, reserveMm: 0, installationNotes: [] }],
  manualComponents: [],
};

describe("sheet_metal.flashings.material-estimate", () => {
  it("implements the exact section boundary and partial next section", () => {
    const exact = calculateFlashingMaterial(base).runs[0];
    expect(exact).toMatchObject({ estimatedSectionCount: 1, jointCount: 0, totalNominalStockLengthMm: 2000, explicitOverlapConsumptionMm: 0, availableCoverageCapacityMm: 2000, unallocatedCoverageCapacityMm: 0 });
    const partial = calculateFlashingMaterial({ ...base, runs: [{ ...base.runs[0], lengthMm: 2001 }] }).runs[0];
    expect(partial).toMatchObject({ estimatedSectionCount: 2, jointCount: 1, totalNominalStockLengthMm: 4000, unallocatedCoverageCapacityMm: 1999 });
  });

  it("uses overlap-aware coverage and reports overlap consumption", () => {
    const input: FlashingMaterialInput = {
      ...base,
      sectionSpec: { ...base.sectionSpec, connection: { mode: "explicit_overlap", overlapMm: 100, source: provenance } },
      runs: [{ ...base.runs[0], lengthMm: 3900 }],
    };
    const boundary = calculateFlashingMaterial(input).runs[0];
    expect(boundary).toMatchObject({ estimatedSectionCount: 2, jointCount: 1, totalNominalStockLengthMm: 4000, explicitOverlapConsumptionMm: 100, availableCoverageCapacityMm: 3900, unallocatedCoverageCapacityMm: 0 });
    const above = calculateFlashingMaterial({ ...input, runs: [{ ...input.runs[0], lengthMm: 3901 }] }).runs[0];
    expect(above.estimatedSectionCount).toBe(3);
    expect(above.explicitOverlapConsumptionMm).toBe(200);
    expect(above.availableCoverageCapacityMm).toBe(5800);
  });

  it("uses supplied additional coverage without inferring physical overlap", () => {
    const result = calculateFlashingMaterial({
      ...base,
      sectionSpec: { ...base.sectionSpec, connection: { mode: "effective_length_supplied", additionalCoveragePerSectionMm: 1900, source: provenance } },
      runs: [{ ...base.runs[0], lengthMm: 3900 }],
    }).runs[0];
    expect(result).toMatchObject({ estimatedSectionCount: 2, totalNominalStockLengthMm: 4000, explicitOverlapConsumptionMm: null, availableCoverageCapacityMm: 3900, unallocatedCoverageCapacityMm: 0 });
  });

  it("estimates runs independently and preserves category coverage", () => {
    const categories = ["verge", "wall", "eaves", "ridge", "valley", "custom"] as const;
    const result = calculateFlashingMaterial({
      ...base,
      runs: categories.map((category, index) => ({ ...base.runs[0], id: `run-${index}`, category, lengthMm: 1500 })),
    });
    expect(result.runs.map((run) => run.estimatedSectionCount)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(result.totals).toMatchObject({ runCount: 6, unresolvedRunCount: 0, estimatedSectionCount: 6, totalNominalStockLengthMm: 12000 });
  });

  it("includes explicit end extensions and keeps reserve separate", () => {
    const result = calculateFlashingMaterial({
      ...base,
      runs: [{ ...base.runs[0], lengthMm: 1800, startExtensionMm: 100, endExtensionMm: 100, reserveMm: 150 }],
    }).runs[0];
    expect(result).toMatchObject({ requiredCoverageLengthMm: 2000, reserveMm: 150, planningTargetLengthMm: 2150, estimatedSectionCount: 2, availableCoverageCapacityMm: 4000, unallocatedCoverageCapacityMm: 1850 });
  });

  it("returns an incomplete result when connection data is unknown", () => {
    const result = calculateFlashingMaterial({
      ...base,
      sectionSpec: { ...base.sectionSpec, connection: { mode: "unknown" } },
    });
    expect(result.runs[0]).toMatchObject({ status: "incomplete", estimatedSectionCount: null, jointCount: null, totalNominalStockLengthMm: null, explicitOverlapConsumptionMm: null, availableCoverageCapacityMm: null });
    expect(result.totals).toMatchObject({ unresolvedRunCount: 1, estimatedSectionCount: null, totalNominalStockLengthMm: null });
    expect(result.warnings.join(" ")).toContain("nem számítható");
  });

  it("rejects invalid overlap, usable length and malformed lengths", () => {
    expect(executeCalculator(flashingMaterialCalculator, { ...base, sectionSpec: { ...base.sectionSpec, connection: { mode: "explicit_overlap", overlapMm: 2000, source: provenance } } }).ok).toBe(false);
    expect(executeCalculator(flashingMaterialCalculator, { ...base, sectionSpec: { ...base.sectionSpec, connection: { mode: "effective_length_supplied", additionalCoveragePerSectionMm: 2001, source: provenance } } }).ok).toBe(false);
    for (const lengthMm of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(executeCalculator(flashingMaterialCalculator, { ...base, runs: [{ ...base.runs[0], lengthMm }] }).ok).toBe(false);
    }
    expect(executeCalculator(flashingMaterialCalculator, { ...base, sectionSpec: { ...base.sectionSpec, nominalLengthMm: 0 } }).ok).toBe(false);
  });

  it("rejects missing geometry provenance, duplicate IDs and arithmetic overflow", () => {
    expect(executeCalculator(flashingMaterialCalculator, { ...base, runs: [{ ...base.runs[0], lengthSource: "geometry" }] }).ok).toBe(false);
    expect(executeCalculator(flashingMaterialCalculator, { ...base, runs: [base.runs[0], base.runs[0]] }).ok).toBe(false);
    const overflow = executeCalculator(flashingMaterialCalculator, { ...base, runs: [{ ...base.runs[0], lengthMm: Number.MAX_SAFE_INTEGER, startExtensionMm: 1 }] });
    expect(overflow).toMatchObject({ ok: false, errors: [{ code: "NUMERIC_OVERFLOW" }] });
  });

  it("retains explicit manual quantities and deterministic output", () => {
    const input: FlashingMaterialInput = {
      ...base,
      runs: [{ ...base.runs[0], lengthMm: 3900, startExtensionMm: 0, endExtensionMm: 0 }],
      sectionSpec: { ...base.sectionSpec, connection: { mode: "explicit_overlap", overlapMm: 100, source: provenance } },
      manualComponents: [{ id: "closure", category: "custom", name: "DEMO lezáró", quantity: 2, note: "DEMO kézi mennyiség", source: provenance }],
    };
    const first = calculateFlashingMaterial(input);
    expect(calculateFlashingMaterial(input)).toEqual(first);
    expect(first.manualComponents[0]).toMatchObject({ quantity: 2, unit: "piece", source: provenance });
    expect(first.totals.manualComponentQuantity).toBe(2);
  });

  it("is registered with stable calculation metadata", () => {
    const result = createProductionCalculatorRegistry().execute(FLASHING_MATERIAL_CALCULATOR_ID, base);
    expect(result).toMatchObject({ ok: true, metadata: { calculatorId: FLASHING_MATERIAL_CALCULATOR_ID, calculatorVersion: "1.0.0" } });
  });
});
