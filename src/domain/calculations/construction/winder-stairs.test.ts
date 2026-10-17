import { describe, expect, it } from "vitest";
import { calculateWinderStairGeometry, winderPolygonIsConvex, winderTreadPolygonArea, winderTreadsOverlap } from "./winder-stairs";

const base = {
  totalRiseMm: 2_800,
  stairWidthMm: 800,
  innerRadiusMm: 300,
  lowerTreadCount: 4,
  upperTreadCount: 6,
  windersPerTurn: 3,
  turnDirection: "right" as const,
};

describe("shared winder staircase geometry", () => {
  it("matches a hand-derived 90 degree annular-sector fixture", () => {
    const result = calculateWinderStairGeometry({ ...base, layout: "quarter_turn" });
    expect(result.turnDegrees).toBe(90);
    expect(result.treadCount).toBe(13);
    expect(result.riserCount).toBe(14);
    expect(result.riserHeightMm).toBe(200);
    expect(result.stepAngleDegrees).toBe(30);
    expect(result.walkingRadiusMm).toBe(700);
    expect(result.walkingGoingMm).toBeCloseTo(700 * Math.PI / 6, 10);
    expect(result.innerChordMm).toBeCloseTo(600 * Math.sin(Math.PI / 12), 10);
    expect(result.outerChordMm).toBeCloseTo(2_200 * Math.sin(Math.PI / 12), 10);
    expect(result.developedWalkingRunMm).toBeCloseTo(13 * 700 * Math.PI / 6, 10);
  });

  it("divides a 180 degree turn into equal sectors and preserves continuous counts", () => {
    const result = calculateWinderStairGeometry({ ...base, layout: "half_turn", windersPerTurn: 4 });
    expect(result.turnDegrees).toBe(180);
    expect(result.stepAngleDegrees).toBe(45);
    expect(result.treadCount).toBe(14);
    expect(result.riserCount).toBe(15);
    expect(result.walkingGoingMm).toBeCloseTo(700 * Math.PI / 4, 10);
    expect(result.treads.filter((tread) => tread.kind === "winder")).toHaveLength(4);
  });

  it("builds two separated turns and three level-consistent flights", () => {
    const result = calculateWinderStairGeometry({ ...base, layout: "three_flight", middleTreadCount: 5 });
    expect(result.turns).toBe(2);
    expect(result.treadCount).toBe(21);
    expect(result.riserCount).toBe(22);
    expect(result.treads.filter((tread) => tread.kind === "winder" && tread.turnIndex === 1)).toHaveLength(3);
    expect(result.treads.filter((tread) => tread.kind === "winder" && tread.turnIndex === 2)).toHaveLength(3);
    expect(result.treads.at(-1)?.levelMm).toBeCloseTo(result.totalRiseMm - result.riserHeightMm, 10);
  });

  it.each(["quarter_turn", "half_turn", "three_flight"] as const)("has finite convex non-overlapping polygons for %s", (layout) => {
    const result = calculateWinderStairGeometry({ ...base, layout, ...(layout === "three_flight" ? { middleTreadCount: 5 } : {}) });
    for (const tread of result.treads) {
      expect(winderTreadPolygonArea(tread.polygon)).toBeGreaterThan(0);
      expect(winderPolygonIsConvex(tread.polygon)).toBe(true);
      for (const point of tread.polygon) expect([...Object.values(point)].every(Number.isFinite)).toBe(true);
    }
    for (let i = 0; i < result.treads.length; i += 1) {
      for (let j = i + 1; j < result.treads.length; j += 1) {
        expect(winderTreadsOverlap(result.treads[i].polygon, result.treads[j].polygon)).toBe(false);
      }
    }
  });

  it.each(["quarter_turn", "half_turn", "three_flight"] as const)("mirrors %s left/right without changing lengths", (layout) => {
    const common = { ...base, layout, ...(layout === "three_flight" ? { middleTreadCount: 5 } : {}) };
    const right = calculateWinderStairGeometry({ ...common, turnDirection: "right" });
    const left = calculateWinderStairGeometry({ ...common, turnDirection: "left" });
    expect(left.planWidthMm).toBeCloseTo(right.planWidthMm, 9);
    expect(left.planDepthMm).toBeCloseTo(right.planDepthMm, 9);
    expect(left.treadCount).toBe(right.treadCount);
    for (let index = 0; index < right.treads.length; index += 1) {
      const mirrored = right.treads[index].polygon.map((point) => ({ xMm: point.xMm, yMm: right.planDepthMm - point.yMm }));
      const sort = (points: readonly { xMm: number; yMm: number }[]) => points.map((point) => `${point.xMm.toFixed(7)},${point.yMm.toFixed(7)}`).sort();
      expect(sort(left.treads[index].polygon)).toEqual(sort(mirrored));
    }
  });

  it("scales all lengths proportionally without changing angles or counts", () => {
    const first = calculateWinderStairGeometry({ ...base, layout: "quarter_turn" });
    const second = calculateWinderStairGeometry({ ...base, layout: "quarter_turn", totalRiseMm: 5_600, stairWidthMm: 1_600, innerRadiusMm: 600 });
    expect(second.walkingGoingMm).toBeCloseTo(first.walkingGoingMm * 2, 9);
    expect(second.planWidthMm).toBeCloseTo(first.planWidthMm * 2, 9);
    expect(second.planDepthMm).toBeCloseTo(first.planDepthMm * 2, 9);
    expect(second.riserHeightMm).toBeCloseTo(first.riserHeightMm * 2, 9);
    expect(second.stepAngleDegrees).toBe(first.stepAngleDegrees);
    expect(second.treadCount).toBe(first.treadCount);
  });

  it("rejects unsupported turn counts, missing middle flight, degenerate sizes and insufficient openings", () => {
    expect(() => calculateWinderStairGeometry({ ...base, layout: "quarter_turn", windersPerTurn: 1 })).toThrow();
    expect(() => calculateWinderStairGeometry({ ...base, layout: "three_flight" })).toThrow();
    expect(() => calculateWinderStairGeometry({ ...base, layout: "quarter_turn", innerRadiusMm: 0 })).toThrow();
    expect(() => calculateWinderStairGeometry({ ...base, layout: "quarter_turn", stairWidthMm: -1 })).toThrow();
    expect(() => calculateWinderStairGeometry({ ...base, layout: "quarter_turn", lowerTreadCount: 4.5 })).toThrow();
    expect(() => calculateWinderStairGeometry({ ...base, layout: "quarter_turn", openingLengthMm: 500 })).toThrow(/tervhossz/);
  });

});
