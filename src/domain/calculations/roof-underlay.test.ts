import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometry } from "./roof-geometry";
import { calculateRoofUnderlayLayout, roofUnderlayParametersSchema } from "./roof-underlay";

const gable = calculateRoofGeometry({ type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } });
const base = { rollWidthMm: 2500, rollLengthMm: 50_000, sideOverlapMm: 100, endOverlapMm: 0, installationDirection: "eave-to-ridge" as const };

describe("roof underlay quantity foundation", () => {
  it("independently checks gable net area, courses, cut lengths, overlap and exact roll packing", () => {
    const result = calculateRoofUnderlayLayout(gable, base);
    expect(result.status).toBe("VALID");
    // The two planes are each 10m × 5m (3-4-5 section); 50m² per side.
    expect(result.netRoofAreaMm2).toBe(100_000_000);
    // A 2.5m roll with a 0.1m side lap advances 2.4m: 3 rows per plane.
    expect(result.courseCount).toBe(6);
    expect(result.calculatedStripLengthMm).toBe(60_000);
    // Six full-width 10m blanks; the 50m roll can pack five and one 10m strip.
    expect(result.grossRequiredUnderlayAreaMm2).toBe(150_000_000);
    expect(result.rollCount).toBe(2);
    expect(result.rollPackingStatus).toBe("exact-minimum");
    expect(result.overlaps.filter((overlap) => overlap.kind === "side-lap")).toHaveLength(4);
    expect(result.courses.every((course) => course.polygon.length >= 4)).toBe(true);
  });

  it("reverses course order without changing geometrical totals", () => {
    const forward = calculateRoofUnderlayLayout(gable, base);
    const reverse = calculateRoofUnderlayLayout(gable, { ...base, installationDirection: "ridge-to-eave" });
    expect(reverse.status).toBe("VALID");
    expect(reverse.courseCount).toBe(forward.courseCount);
    expect(reverse.grossRequiredUnderlayAreaMm2).toBe(forward.grossRequiredUnderlayAreaMm2);
    expect(reverse.courses[0].startDistanceMm).toBeGreaterThan(forward.courses[0].startDistanceMm);
  });

  it("draws each physical course pair overlap when explicit lap width causes multiple overlapping layers", () => {
    const result = calculateRoofUnderlayLayout(gable, { ...base, rollWidthMm: 2500, sideOverlapMm: 1400 });
    expect(result.status).toBe("VALID");
    expect(result.courseCount).toBe(8);
    // Four courses on each plane have three adjacent and two second-neighbour intersections.
    expect(result.overlaps.filter((overlap) => overlap.kind === "side-lap")).toHaveLength(10);
  });

  it("calculates end laps and exact one-dimensional roll cuts without area division", () => {
    const longRoof = calculateRoofGeometry({ type: "gable", geometry: { inputMode: "height", buildingLengthMm: 60_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } });
    const result = calculateRoofUnderlayLayout(longRoof, { ...base, rollLengthMm: 30_000, endOverlapMm: 2_000 });
    expect(result.status).toBe("VALID");
    expect(result.courseCount).toBe(6);
    expect(result.pieces).toHaveLength(18);
    expect(result.pieces.filter((piece) => piece.lengthMm === 30_000)).toHaveLength(12);
    expect(result.pieces.filter((piece) => piece.lengthMm === 4_000)).toHaveLength(6);
    expect(result.pieces.reduce((sum, piece) => sum + piece.lengthMm, 0)).toBe(384_000);
    expect(result.rollCount).toBe(13);
    expect(result.overlaps.filter((overlap) => overlap.kind === "end-lap")).toHaveLength(12);
  });

  it("supports a hip roof's convex triangular and trapezoidal facets", () => {
    const point = (xMm: number, yMm: number, zMm: number) => ({ xMm, yMm, zMm });
    const planes = [
      { id: "south", points: [point(0, 0, 0), point(10_000, 0, 0), point(7_000, 3_000, 3_000), point(3_000, 3_000, 3_000)], areaMm2: 42_426_406.871 },
      { id: "north", points: [point(0, 6_000, 0), point(3_000, 3_000, 3_000), point(7_000, 3_000, 3_000), point(10_000, 6_000, 0)], areaMm2: 42_426_406.871 },
      { id: "west-hip", points: [point(0, 0, 0), point(3_000, 3_000, 3_000), point(0, 6_000, 0)], areaMm2: 12_727_922.061 },
      { id: "east-hip", points: [point(10_000, 0, 0), point(10_000, 6_000, 0), point(7_000, 3_000, 3_000)], areaMm2: 12_727_922.061 },
    ];
    const geometry: RoofGeometry = { type: "hip", modelVersion: "1.0.0", planes: planes.map(({ id, points, areaMm2 }) => ({ id, vertices: points, areaMm2, projectedAreaMm2: areaMm2 / Math.SQRT2, pitchDegrees: 45 })), edges: [], totalAreaMm2: planes.reduce((sum, plane) => sum + plane.areaMm2, 0), projectedAreaMm2: planes.reduce((sum, plane) => sum + plane.areaMm2 / Math.SQRT2, 0) };
    const result = calculateRoofUnderlayLayout(geometry, { ...base, rollWidthMm: 2000, sideOverlapMm: 100 });
    expect(result.status).toBe("VALID");
    expect(result.courseCount).toBeGreaterThan(0);
    expect(result.courses.some((course) => course.planeId === "west-hip" && course.polygon.length === 3)).toBe(true);
    expect(result.rollCount).toBeGreaterThan(0);
  });

  it.each(["halfHip", "pyramid", "lShape", "tShape"] as const)("returns an explicit unsupported result for %s topology", (type) => {
    const geometry = type === "pyramid"
      ? calculateRoofGeometry({ type, sideMm: 6000, pitchDegrees: 45 })
      : type === "halfHip"
        ? calculateRoofGeometry({ type, lengthMm: 10_000, widthMm: 6000, pitchDegrees: 45, hipEaveHeightMm: 1000 })
        : calculateRoofGeometry({ type, lengthMm: 10_000, widthMm: 6000, pitchDegrees: 45, wingWidthMm: 4000, wingProjectionMm: 5000 });
    const result = calculateRoofUnderlayLayout(geometry, base);
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.rollCount).toBeNull();
    expect(result.netRoofAreaMm2).toBeGreaterThan(0);
  });

  it("never returns a roll estimate from area when required inputs or cutting data are missing", () => {
    const incomplete = calculateRoofUnderlayLayout(gable, {});
    expect(incomplete.status).toBe("INCOMPLETE");
    expect(incomplete.netRoofAreaMm2).toBe(100_000_000);
    expect(incomplete.rollCount).toBeNull();
    const uncuttable = calculateRoofUnderlayLayout(gable, { ...base, rollLengthMm: 4000 });
    expect(uncuttable.status).toBe("UNSUPPORTED");
    expect(uncuttable.rollCount).toBeNull();
  });

  it("rejects invalid product dimensions, overlaps and installation directions", () => {
    expect(roofUnderlayParametersSchema.safeParse({ ...base, rollWidthMm: 0 }).success).toBe(false);
    expect(calculateRoofUnderlayLayout(gable, { ...base, sideOverlapMm: 2500 }).status).toBe("INVALID");
    expect(calculateRoofUnderlayLayout(gable, { ...base, endOverlapMm: 50_000 }).status).toBe("INVALID");
    expect(roofUnderlayParametersSchema.safeParse({ ...base, installationDirection: "left-to-right" }).success).toBe(false);
  });
});
