import { describe, expect, it } from "vitest";
import { calculateSpiralStairGeometry, calculateStraightStairGeometry } from "@/domain/calculations/construction/stairs";
import { createStraightStairDrawingGeometry } from "./construction-stairs";

describe("construction staircase drawing geometry", () => {
  it("maps calculated risers and goings to the same run and rise without adding dimensions", () => {
    const result = calculateStraightStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, riserCount: 16, stairWidthMm: 800 });
    const drawing = createStraightStairDrawingGeometry(result, 800);
    expect(drawing.treads).toHaveLength(15);
    expect(drawing.treads.at(-1)?.xEndMm).toBe(result.totalRunMm);
    expect(drawing.treads[0]?.levelMm).toBe(result.riserHeightMm);
    expect(drawing.treads.at(-1)?.levelMm).toBe(15 * result.riserHeightMm);
    expect(drawing.totalRiseMm).toBe(2_800);
    expect(drawing.widthMm).toBe(800);
  });

  it("preserves straight-stair ratios under uniform scaling and ignores drawing-only width in calculation", () => {
    const original = calculateStraightStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, riserCount: 16 });
    const scaled = calculateStraightStairGeometry({ totalRiseMm: 5_600, availableRunMm: 8_400, riserCount: 16, stairWidthMm: 1_600 });
    expect(scaled.riserHeightMm).toBe(original.riserHeightMm * 2);
    expect(scaled.goingMm).toBe(original.goingMm * 2);
    expect(scaled.pitchLineLengthMm).toBe(original.pitchLineLengthMm * 2);
    expect(scaled.pitchDegrees).toBe(original.pitchDegrees);
    expect(scaled.stepRuleMm).toBe(original.stepRuleMm * 2);
  });

  it("keeps the spiral plan dimensions and riser schedule on the calculator geometry", () => {
    const result = calculateSpiralStairGeometry({ totalRiseMm: 3_000, outerDiameterMm: 2_000, innerDiameterMm: 400, turnDegrees: 360, riserCount: 18 });
    expect(result.walkingRadiusMm).toBe((2_000 + 400) / 4);
    expect(result.treadCount).toBe(17);
    expect(result.stepAngleDegrees * result.treadCount).toBeCloseTo(360, 10);
    expect(result.walkingGoingMm * result.treadCount).toBeCloseTo(result.walkingLineLengthMm, 8);
  });

  it("keeps the upper spiral input boundary finite when one tread covers multiple turns", () => {
    const result = calculateSpiralStairGeometry({ totalRiseMm: 2_400, outerDiameterMm: 1_800, innerDiameterMm: 300, turnDegrees: 1_440, riserCount: 2 });
    expect(result.treadCount).toBe(1);
    expect(result.stepAngleDegrees).toBe(1_440);
    expect(result.walkingLineLengthMm).toBeCloseTo(8 * Math.PI * result.walkingRadiusMm, 10);
    expect(Number.isFinite(result.walkingGoingMm)).toBe(true);
  });
});
