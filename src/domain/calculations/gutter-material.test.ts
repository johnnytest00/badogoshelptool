import { describe, expect, it } from "vitest";
import { executeCalculator } from "@/domain/calculations/engine";
import { createProductionCalculatorRegistry } from "./registry";
import { calculateGutterMaterial, gutterMaterialCalculator, type GutterMaterialInput } from "./gutter-material";

const singleRun: GutterMaterialInput = {
  gutterStockLengthMm: 4000,
  runs: [{ id: "front", name: "Első eresz", lengthMm: 8500, description: "DEMO", measurementSource: "demo", roofEdge: null, bracketSpacingMm: null }],
  downpipes: [],
  manualComponents: [{ id: "caps", category: "end_cap", quantity: 2, note: "DEMO kézi darabszám" }],
};

describe("gutters.material-estimate", () => {
  it("calculates independent runs and exact stock boundaries", () => {
    const result = calculateGutterMaterial({
      ...singleRun,
      runs: [singleRun.runs[0], { ...singleRun.runs[0], id: "back", name: "Hátsó eresz", lengthMm: 8000 }],
    });
    expect(result.totals.gutterStockSections).toBe(5);
    expect(result.gutterRuns[0]).toMatchObject({ stockSections: 3, remainderMm: 500 });
    expect(result.gutterRuns[1]).toMatchObject({ stockSections: 2, remainderMm: null });
  });

  it("keeps downpipes and manual quantities explicit", () => {
    const result = calculateGutterMaterial({ ...singleRun, downpipes: [{ id: "down-1", name: "Bal lefolyó", lengthMm: 5100, commercialLengthMm: 3000, selectedBends: 2, relatedAccessories: [] }] });
    expect(result.totals.downpipeStockSections).toBe(2);
    expect(result.downpipeRuns[0]).toMatchObject({ stockSections: 2, remainderMm: 2100, selectedBends: 2 });
    expect(result.totals.totalManualComponents).toBe(2);
  });

  it("marks bracket output as a user-spacing estimate", () => {
    const result = calculateGutterMaterial({ ...singleRun, runs: [{ ...singleRun.runs[0], bracketSpacingMm: 500 }] });
    expect(result.gutterRuns[0].bracketEstimate).toBe(18);
    expect(result.warnings[0]).toContain("felhasználó által megadott kiosztás");
  });

  it("rejects zero, negative and duplicate definitions", () => {
    expect(executeCalculator(gutterMaterialCalculator, { ...singleRun, gutterStockLengthMm: 0 }).ok).toBe(false);
    expect(executeCalculator(gutterMaterialCalculator, { ...singleRun, runs: [{ ...singleRun.runs[0], lengthMm: -1 }] }).ok).toBe(false);
    expect(() => calculateGutterMaterial({ ...singleRun, downpipes: [{ id: "front", name: "Duplikált", lengthMm: 1000, commercialLengthMm: 1000, selectedBends: 0, relatedAccessories: [] }] })).toThrow("Ismétlődő");
  });

  it("is registered with deterministic metadata", () => {
    const result = createProductionCalculatorRegistry().execute("gutters.material-estimate", singleRun);
    expect(result).toMatchObject({ ok: true, metadata: { calculatorId: "gutters.material-estimate", calculatorVersion: "1.0.0" } });
  });
});
