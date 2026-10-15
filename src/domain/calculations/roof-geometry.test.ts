import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, roofGeometryInputSchema, type RoofGeometryInput } from "./roof-geometry";

const m = 1000;
const common = { lengthMm: 10 * m, widthMm: 6 * m, pitchDegrees: 45 } as const;
const fixtures: { input: RoofGeometryInput; projected: number; area: number; ridge: number; valleys: number }[] = [
  { input: { type: "shed", ...common }, projected: 60e6, area: 60e6 * Math.SQRT2, ridge: 0, valleys: 0 },
  { input: { type: "hip", ...common }, projected: 60e6, area: 60e6 * Math.SQRT2, ridge: 4 * m, valleys: 0 },
  { input: { type: "pyramid", sideMm: 6 * m, pitchDegrees: 45 }, projected: 36e6, area: 36e6 * Math.SQRT2, ridge: 0, valleys: 0 },
  { input: { type: "halfHip", ...common, hipEaveHeightMm: m }, projected: 60e6, area: 60e6 * Math.SQRT2, ridge: 6 * m, valleys: 0 },
  { input: { type: "lShape", ...common, wingWidthMm: 4 * m, wingProjectionMm: 5 * m }, projected: 80e6, area: 80e6 * Math.SQRT2, ridge: 17 * m, valleys: 2 },
  { input: { type: "tShape", ...common, wingWidthMm: 4 * m, wingProjectionMm: 5 * m }, projected: 80e6, area: 80e6 * Math.SQRT2, ridge: 17 * m, valleys: 2 },
];

describe("parameterized roof geometry", () => {
  it.each(fixtures)("calculates $input.type without surface overlap", ({ input, projected, area, ridge, valleys }) => {
    const result = calculateRoofGeometry(input);
    expect(result.projectedAreaMm2).toBeCloseTo(projected, 3);
    expect(result.totalAreaMm2).toBeCloseTo(area, 3);
    expect(result.planes.reduce((sum, plane) => sum + plane.projectedAreaMm2, 0)).toBeCloseTo(projected, 3);
    expect(result.edges.filter((edge) => edge.kind === "ridge").reduce((sum, edge) => sum + edge.lengthMm, 0)).toBeCloseTo(ridge, 3);
    expect(result.edges.filter((edge) => edge.kind === "valley").length).toBe(valleys);
    expect(result.edges.every((edge) => edge.adjacentPlaneIds.length >= 1 && edge.adjacentPlaneIds.length <= 2 && edge.adjacentPlaneIds.every((id) => result.planes.some((plane) => plane.id === id)))).toBe(true);
    expect(result.planes.every((plane) => plane.vertices.length >= 3 && plane.areaMm2 > 0 && plane.vertices.every((v) => Number.isFinite(v.zMm)))).toBe(true);
    expect(calculateRoofGeometry(input).edges.map((edge) => edge.id)).toEqual(result.edges.map((edge) => edge.id));
  });

  it("preserves the verified gable geometry and legacy segment identities", () => {
    const result = calculateRoofGeometry({ type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10 * m, buildingWidthMm: 6 * m, roofRiseMm: 4 * m, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } });
    expect(result.totalAreaMm2).toBe(100e6);
    expect(result.edges.find((edge) => edge.id === "left-eave")?.lengthMm).toBe(10 * m);
    expect(result.edges.find((edge) => edge.id === "ridge")?.lengthMm).toBe(10 * m);
    expect(result.edges.filter((edge) => edge.kind === "rake").map((edge) => edge.lengthMm)).toEqual([5 * m, 5 * m, 5 * m, 5 * m]);
  });

  it("uses independently calculated hip, half-hip and intersection edge lengths", () => {
    for (const input of [{ type: "hip", ...common }, { type: "pyramid", sideMm: 6 * m, pitchDegrees: 45 }] as const) {
      const result = calculateRoofGeometry(input);
      const hips = result.edges.filter((edge) => edge.kind === "hip");
      expect(hips).toHaveLength(4);
      hips.forEach((edge) => expect(edge.lengthMm).toBeCloseTo(3 * m * Math.sqrt(3), 5));
    }
    const halfHip = calculateRoofGeometry({ type: "halfHip", ...common, hipEaveHeightMm: m });
    expect(halfHip.edges.filter((edge) => edge.kind === "hip")).toHaveLength(4);
    halfHip.edges.filter((edge) => edge.kind === "hip").forEach((edge) => expect(edge.lengthMm).toBeCloseTo(2 * m * Math.sqrt(3), 5));
    for (const type of ["lShape", "tShape"] as const) {
      const roof = calculateRoofGeometry({ type, ...common, wingWidthMm: 4 * m, wingProjectionMm: 5 * m });
      // Equal 45° slopes intersect from each junction point to (x ± 2 m, y = 2 m, z = 2 m).
      roof.edges.filter((edge) => edge.kind === "valley").forEach((edge) => expect(edge.lengthMm).toBeCloseTo(2 * m * Math.sqrt(3), 5));
    }
  });

  it.each(["lShape", "tShape"] as const)("partitions the %s footprint exactly once, including the intersection", (type) => {
    const roof = calculateRoofGeometry({ type, lengthMm: 10 * m, widthMm: 6 * m, pitchDegrees: 30,
      wingWidthMm: 4 * m, wingProjectionMm: 5 * m });
    expect(roof.totalAreaMm2).toBeCloseTo(80e6 / Math.cos(Math.PI / 6), 3);
    const wingX0 = type === "lShape" ? 0 : 3 * m;
    const contains = (vertices: readonly { xMm: number; yMm: number }[], x: number, y: number) => {
      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const a = vertices[i], b = vertices[j];
        if ((a.yMm > y) !== (b.yMm > y) && x < (b.xMm - a.xMm) * (y - a.yMm) / (b.yMm - a.yMm) + a.xMm) inside = !inside;
      }
      return inside;
    };
    for (let x = 250; x < 10 * m; x += 500) for (let y = -5 * m + 250; y < 6 * m; y += 500) {
      const expected = y >= 0 || (x >= wingX0 && x < wingX0 + 4 * m);
      const coveringPlanes = roof.planes.filter((plane) => contains(plane.vertices, x, y));
      expect(coveringPlanes.length, `${type} @ ${x},${y}`).toBe(expected ? 1 : 0);
    }
  });

  it("rejects infeasible and incomplete models", () => {
    expect(roofGeometryInputSchema.safeParse({ type: "hip", lengthMm: 4 * m, widthMm: 6 * m, pitchDegrees: 45 }).success).toBe(false);
    expect(roofGeometryInputSchema.safeParse({ type: "halfHip", ...common, hipEaveHeightMm: 4 * m }).success).toBe(false);
    expect(roofGeometryInputSchema.safeParse({ type: "tShape", ...common, wingWidthMm: 7 * m, wingProjectionMm: 5 * m }).success).toBe(false);
    expect(roofGeometryInputSchema.safeParse({ type: "shed", lengthMm: 10 * m, widthMm: 6 * m }).success).toBe(false);
  });
});
