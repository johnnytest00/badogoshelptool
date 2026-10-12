import { describe, expect, it } from "vitest";
import { executeCalculator } from "@/domain/calculations/engine";
import {
  calculateGableRoof,
  gableRoofCalculator,
  type GableRoofInput,
} from "@/domain/calculations/gable-roof";
import { createProductionCalculatorRegistry } from "@/domain/calculations/registry";

const referenceInput: GableRoofInput = {
  inputMode: "height",
  buildingWidthMm: 8000,
  buildingLengthMm: 12000,
  roofRiseMm: 3000,
  eaveOverhangMm: 500,
  frontGableOverhangMm: 250,
  rearGableOverhangMm: 250,
};

describe("roof.gable", () => {
  it("matches the independently verifiable reference case", () => {
    const result = calculateGableRoof(referenceInput);
    expect(result.lengths.halfSpanMm).toBe(4000);
    expect(result.angles.pitchDegrees).toBeCloseTo(36.86989765, 7);
    expect(result.lengths.slopeLengthToWallMm).toBe(5000);
    expect(result.dimensions.horizontalSlopeRunMm).toBe(4500);
    expect(result.lengths.slopeLengthIncludingEaveMm).toBe(5625);
    expect(result.dimensions.overallRoofLengthMm).toBe(12500);
    expect(result.areas.individualRoofPlaneM2).toBe(70.3125);
    expect(result.areas.combinedRoofM2).toBe(140.625);
    expect(result.areas.horizontalProjectedM2).toBe(112.5);
    expect(result.lengths.totalEaveEdgesMm).toBe(25000);
    expect(result.lengths.ridgeLineMm).toBe(12500);
    expect(result.lengths.totalSlopingGableEdgesMm).toBe(22500);
  });

  it("produces equivalent geometry for height and angle authority", () => {
    const heightResult = calculateGableRoof(referenceInput);
    const angleResult = calculateGableRoof({
      ...referenceInput,
      inputMode: "angle",
      roofRiseMm: undefined,
      roofPitchDegrees: heightResult.angles.pitchDegrees,
    } as GableRoofInput);
    expect(angleResult.angles.pitchDegrees).toBeCloseTo(heightResult.angles.pitchDegrees, 10);
    expect(angleResult.heights.roofRiseMm).toBeCloseTo(heightResult.heights.roofRiseMm, 8);
    expect(angleResult.areas.combinedRoofM2).toBeCloseTo(heightResult.areas.combinedRoofM2, 8);
  });

  it("keeps symmetry, scaling and deterministic output", () => {
    const first = calculateGableRoof(referenceInput);
    const second = calculateGableRoof(referenceInput);
    expect(second).toEqual(first);
    expect(first.planes[0].areaMm2).toBe(first.planes[1].areaMm2);
    expect(calculateGableRoof({ ...referenceInput, buildingLengthMm: 24000 }).areas.combinedRoofM2).toBeCloseTo(first.areas.combinedRoofM2 * (24500 / 12500), 10);
    expect(calculateGableRoof({ ...referenceInput, eaveOverhangMm: 0 }).lengths.slopeLengthIncludingEaveMm).toBe(5000);
  });

  it("rejects invalid input at the schema boundary", () => {
    expect(executeCalculator(gableRoofCalculator, { ...referenceInput, buildingWidthMm: 0 }).ok).toBe(false);
    expect(executeCalculator(gableRoofCalculator, { ...referenceInput, roofRiseMm: Number.NaN }).ok).toBe(false);
    expect(executeCalculator(gableRoofCalculator, { ...referenceInput, eaveOverhangMm: -1 }).ok).toBe(false);
    expect(executeCalculator(gableRoofCalculator, { ...referenceInput, inputMode: "angle", roofPitchDegrees: 90, roofRiseMm: undefined }).ok).toBe(false);
    const missing = executeCalculator(gableRoofCalculator, { ...referenceInput, inputMode: "height", roofRiseMm: undefined });
    expect(missing.ok).toBe(false);
  });

  it("is registered as the only implemented production roof calculator", () => {
    const registry = createProductionCalculatorRegistry();
    const result = registry.execute("roof.gable", referenceInput);
    expect(result).toMatchObject({ ok: true, metadata: { calculatorId: "roof.gable", calculatorVersion: "1.0.0" } });
    expect(() => registry.resolve("roof.hip")).toThrow(/Unknown calculator/);
  });
});
