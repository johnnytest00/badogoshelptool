import { describe, expect, it } from "vitest";
import { executeCalculator } from "@/domain/calculations/engine";
import { createProductionCalculatorRegistry } from "@/domain/calculations/registry";
import { calculateMetalSheetLayout, metalSheetLayoutCalculator, type MetalSheetLayoutInput } from "./metal-sheet-layout";

const referenceInput: MetalSheetLayoutInput = {
  roof: { startXmm: -250, endXmm: 12250, slopeLengthMm: 5625 },
  effectiveCoveringWidthMm: 1000,
  nominalSheetWidthMm: null,
  alignment: "left",
  minimumSheetLengthMm: null,
  maximumSheetLengthMm: null,
  endAllowanceMm: null,
};

describe("covering.metal-sheets.layout", () => {
  it("matches reference A with a 500 mm partial edge interval", () => {
    const result = calculateMetalSheetLayout(referenceInput);
    expect(result.stripsPerPlane).toBe(13);
    expect(result.totalStripCount).toBe(26);
    expect(result.fullWidthIntervalsPerPlane).toBe(12);
    expect(result.partialEdgeIntervalMm).toBe(500);
    expect(result.geometricSheetLengthMm).toBe(5625);
    expect(result.strips.filter((strip) => strip.isPartial)).toHaveLength(2);
  });

  it("matches independently established 1250 mm and 800 mm references", () => {
    const exact = calculateMetalSheetLayout({ ...referenceInput, effectiveCoveringWidthMm: 1250 });
    expect(exact.stripsPerPlane).toBe(10);
    expect(exact.totalStripCount).toBe(20);
    expect(exact.fullWidthIntervalsPerPlane).toBe(10);
    expect(exact.partialEdgeIntervalMm).toBeNull();
    const narrow = calculateMetalSheetLayout({ ...referenceInput, effectiveCoveringWidthMm: 800 });
    expect(narrow.stripsPerPlane).toBe(16);
    expect(narrow.totalStripCount).toBe(32);
    expect(narrow.partialEdgeIntervalMm).toBe(500);
  });

  it("moves only the partial strip when alignment changes", () => {
    const fromLeft = calculateMetalSheetLayout(referenceInput);
    const fromRight = calculateMetalSheetLayout({ ...referenceInput, alignment: "right" });
    const leftPartial = fromLeft.strips.find((strip) => strip.planeSide === "left" && strip.isPartial);
    const rightPartial = fromRight.strips.find((strip) => strip.planeSide === "left" && strip.isPartial);
    expect(leftPartial).toMatchObject({ startXmm: 11750, endXmm: 12250, effectiveWidthMm: 500 });
    expect(rightPartial).toMatchObject({ startXmm: -250, endXmm: 250, effectiveWidthMm: 500 });
    expect(fromRight.stripsPerPlane).toBe(fromLeft.stripsPerPlane);
    expect(fromRight.roofLongitudinalLengthMm).toBe(12500);
  });

  it("keeps geometric length separate and reports user-provided manufacturing limits", () => {
    const result = calculateMetalSheetLayout({ ...referenceInput, maximumSheetLengthMm: 5000, endAllowanceMm: 100 });
    expect(result.geometricSheetLengthMm).toBe(5625);
    expect(result.endAllowanceMm).toBe(100);
    expect(result.provisionalSheetLengthMm).toBe(5725);
    expect(result.manufacturingStatus).toBe("outside_limits");
    expect(result.manufacturingIssues).toEqual([expect.objectContaining({ code: "ABOVE_MAXIMUM_LENGTH" })]);
  });

  it("accepts Hungarian-decimal-compatible millimeter precision", () => {
    const result = calculateMetalSheetLayout({ ...referenceInput, roof: { ...referenceInput.roof, slopeLengthMm: 6562.5 }, effectiveCoveringWidthMm: 1000.5 });
    expect(result.geometricSheetLengthMm).toBe(6562.5);
    expect(result.stripsPerPlane).toBe(13);
  });

  it("rejects invalid and unsafe layouts through the calculator boundary", () => {
    expect(executeCalculator(metalSheetLayoutCalculator, { ...referenceInput, effectiveCoveringWidthMm: 0 }).ok).toBe(false);
    expect(executeCalculator(metalSheetLayoutCalculator, { ...referenceInput, minimumSheetLengthMm: 6000, maximumSheetLengthMm: 5000 }).ok).toBe(false);
    const tooMany = executeCalculator(metalSheetLayoutCalculator, { ...referenceInput, effectiveCoveringWidthMm: 1 });
    expect(tooMany).toMatchObject({ ok: false, errors: [expect.objectContaining({ code: "UNSUPPORTED_OPERATION" })] });
  });

  it("is available from the production calculator registry", () => {
    const result = createProductionCalculatorRegistry().execute("covering.metal-sheets.layout", referenceInput);
    expect(result).toMatchObject({ ok: true, metadata: { calculatorId: "covering.metal-sheets.layout", calculatorVersion: "1.0.0" } });
  });
});
