import { describe, expect, it } from "vitest";
import { calculateConcreteStairGeometry, calculateLandingStairGeometry, landingStairGeometryInputSchema } from "./stairs";

describe("orthogonal landing stair geometry", () => {
  it("builds a 90 degree landing plan from explicit flight and landing dimensions", () => {
    const result = calculateLandingStairGeometry({
      layout: "quarter_turn", totalRiseMm: 3_000, stairWidthMm: 900, goingMm: 250,
      landingDepthMm: 900, flightRiserCounts: [8, 8], turnDirection: "right",
    });
    expect(result.riserHeightMm).toBe(187.5);
    expect(result.riserCount).toBe(16);
    expect(result.treadCount).toBe(14);
    expect(result.flights.map((flight) => flight.runMm)).toEqual([1_750, 1_750]);
    expect(result.planWidthMm).toBe(2_650);
    expect(result.planDepthMm).toBe(2_650);
    expect(result.landings).toHaveLength(1);
    expect(result.flights[0].treads[0].levelMm).toBe(result.riserHeightMm);
    expect(result.flights[1].startRiseMm).toBe(1_500);
    expect(result.flights[1].endRiseMm).toBe(3_000);
    const scaled = calculateLandingStairGeometry({ layout: "quarter_turn", totalRiseMm: 6_000, stairWidthMm: 1_800, goingMm: 500, landingDepthMm: 1_800, flightRiserCounts: [8, 8] });
    expect(scaled.planWidthMm).toBe(2 * result.planWidthMm);
    expect(scaled.planDepthMm).toBe(2 * result.planDepthMm);
    expect(scaled.riserHeightMm).toBe(2 * result.riserHeightMm);
  });

  it("builds a 180 degree return layout with an explicit flight gap", () => {
    const result = calculateLandingStairGeometry({
      layout: "half_turn", totalRiseMm: 2_800, stairWidthMm: 900, goingMm: 280,
      landingDepthMm: 1_000, landingGapMm: 200, flightRiserCounts: [8, 8],
    });
    expect(result.planWidthMm).toBe(2_960);
    expect(result.planDepthMm).toBe(2_000);
    expect(result.flights[0].runMm).toBe(1_960);
    expect(result.flights[1].runMm).toBe(1_960);
    const firstFlightMaxY = Math.max(...result.flights[0].treads.flatMap((tread) => tread.polygon.map((point) => point.yMm)));
    const secondFlightMinY = Math.min(...result.flights[1].treads.flatMap((tread) => tread.polygon.map((point) => point.yMm)));
    expect(secondFlightMinY - firstFlightMaxY).toBe(200);
  });

  it("keeps the three-flight rises uniform and mirrors a left-turn plan", () => {
    const input = { layout: "three_flight" as const, totalRiseMm: 3_000, stairWidthMm: 900, goingMm: 250, landingDepthMm: 900, flightRiserCounts: [6, 6, 6] };
    const right = calculateLandingStairGeometry({ ...input, turnDirection: "right" });
    const left = calculateLandingStairGeometry({ ...input, turnDirection: "left" });
    expect(right.riserCount).toBe(18);
    expect(right.riserHeightMm).toBeCloseTo(3_000 / 18, 12);
    expect(right.treadCount).toBe(15);
    expect(right.flights.map((flight) => [flight.startRiseMm, flight.endRiseMm])).toEqual([
      [0, 1_000], [1_000, 2_000], [2_000, 3_000],
    ]);
    expect(right.landings).toHaveLength(2);
    expect(right.planWidthMm).toBe(2_150);
    expect(right.planDepthMm).toBe(3_050);
    expect(left.planWidthMm).toBe(right.planWidthMm);
    expect(left.planDepthMm).toBe(right.planDepthMm);
    expect(left.landings[0][0].yMm).not.toBe(right.landings[0][0].yMm);
  });

  it("rejects mismatched flight counts, undersized landings, and layouts that exceed an explicit opening", () => {
    expect(landingStairGeometryInputSchema.safeParse({ layout: "quarter_turn", totalRiseMm: 3_000, stairWidthMm: 900, goingMm: 250, landingDepthMm: 800, flightRiserCounts: [8, 8] }).success).toBe(false);
    expect(landingStairGeometryInputSchema.safeParse({ layout: "three_flight", totalRiseMm: 3_000, stairWidthMm: 900, goingMm: 250, landingDepthMm: 900, flightRiserCounts: [8, 8] }).success).toBe(false);
    expect(() => calculateLandingStairGeometry({ layout: "quarter_turn", totalRiseMm: 3_000, stairWidthMm: 900, goingMm: 250, landingDepthMm: 900, flightRiserCounts: [8, 8], openingLengthMm: 2_000 })).toThrow(/tervhossz/);
  });

  it("calculates an independently dimensioned solid concrete stair wedge", () => {
    const result = calculateConcreteStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, stairWidthMm: 1_000, riserCount: 16 });
    expect(result.riserHeightMm).toBe(175);
    expect(result.treadCount).toBe(15);
    expect(result.goingMm).toBe(280);
    expect(result.wedgeVolumeM3).toBeCloseTo(5.88, 12);
    expect(() => calculateConcreteStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, stairWidthMm: 1_000, riserCount: 1 })).toThrow();
  });
});
