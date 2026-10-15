import { describe, expect, it } from "vitest";
import {
  ENGINEERING_AREA_TOLERANCE_MM2,
  ENGINEERING_LENGTH_TOLERANCE_MM,
  ENGINEERING_RELATIVE_TOLERANCE,
  ROOF_ENGINEERING_REFERENCES,
} from "./engineering-reference-fixtures";
import { calculateRoofGeometry, roofGeometryInputSchema, type RoofGeometryInput, type RoofPoint } from "./roof-geometry";

function expectNear(actual: number, expected: number, absoluteTolerance: number): void {
  const tolerance = Math.max(absoluteTolerance, Math.abs(expected) * ENGINEERING_RELATIVE_TOLERANCE);
  expect(Math.abs(actual - expected), `${actual} differs from ${expected} by more than ${tolerance}`).toBeLessThanOrEqual(tolerance);
}

function triangleArea3d(a: RoofPoint, b: RoofPoint, c: RoofPoint): number {
  const ab = { x: b.xMm - a.xMm, y: b.yMm - a.yMm, z: b.zMm - a.zMm };
  const ac = { x: c.xMm - a.xMm, y: c.yMm - a.yMm, z: c.zMm - a.zMm };
  const cross = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  return Math.hypot(cross.x, cross.y, cross.z) / 2;
}

function polygonArea3d(vertices: readonly RoofPoint[]): number {
  return vertices.slice(1, -1).reduce((sum, vertex, index) => sum + triangleArea3d(vertices[0], vertex, vertices[index + 2]), 0);
}

function projectedArea(vertices: readonly RoofPoint[]): number {
  return Math.abs(vertices.reduce((sum, point, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return sum + point.xMm * next.yMm - next.xMm * point.yMm;
  }, 0) / 2);
}

function distance(a: RoofPoint, b: RoofPoint): number {
  return Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm, b.zMm - a.zMm);
}

function isOnBoundary(point: RoofPoint, vertices: readonly RoofPoint[]): boolean {
  return vertices.some((start, index) => {
    const end = vertices[(index + 1) % vertices.length];
    const error = Math.abs(distance(start, point) + distance(point, end) - distance(start, end));
    return error <= ENGINEERING_LENGTH_TOLERANCE_MM;
  });
}

function orientation(a: RoofPoint, b: RoofPoint, c: RoofPoint): number {
  return (b.xMm - a.xMm) * (c.yMm - a.yMm) - (b.yMm - a.yMm) * (c.xMm - a.xMm);
}

function hasProperSelfIntersection(vertices: readonly RoofPoint[]): boolean {
  for (let first = 0; first < vertices.length; first += 1) {
    const firstNext = (first + 1) % vertices.length;
    for (let second = first + 1; second < vertices.length; second += 1) {
      const secondNext = (second + 1) % vertices.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      const a = vertices[first], b = vertices[firstNext], c = vertices[second], d = vertices[secondNext];
      if (orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0) return true;
    }
  }
  return false;
}

function scaleInput(input: RoofGeometryInput, factor: number): RoofGeometryInput {
  switch (input.type) {
    case "gable": {
      const geometry = input.geometry;
      if (geometry.inputMode !== "height") throw new Error("The engineering scale fixture requires height authority.");
      return { type: "gable", geometry: { ...geometry, buildingLengthMm: geometry.buildingLengthMm * factor,
        buildingWidthMm: geometry.buildingWidthMm * factor, roofRiseMm: geometry.roofRiseMm * factor,
        eaveOverhangMm: geometry.eaveOverhangMm * factor, frontGableOverhangMm: geometry.frontGableOverhangMm * factor,
        rearGableOverhangMm: geometry.rearGableOverhangMm * factor } };
    }
    case "pyramid": return { ...input, sideMm: input.sideMm * factor };
    case "halfHip": return { ...input, lengthMm: input.lengthMm * factor, widthMm: input.widthMm * factor, hipEaveHeightMm: input.hipEaveHeightMm * factor };
    case "lShape":
    case "tShape": return { ...input, lengthMm: input.lengthMm * factor, widthMm: input.widthMm * factor,
      wingWidthMm: input.wingWidthMm * factor, wingProjectionMm: input.wingProjectionMm * factor };
    default: return { ...input, lengthMm: input.lengthMm * factor, widthMm: input.widthMm * factor };
  }
}

describe("independent engineering audit of all supported roof geometries", () => {
  it.each(ROOF_ENGINEERING_REFERENCES)("matches the hand-derived reference: $name", (reference) => {
    const roof = calculateRoofGeometry(reference.input);
    expectNear(roof.projectedAreaMm2, reference.expectedProjectedAreaMm2, ENGINEERING_AREA_TOLERANCE_MM2);
    expectNear(roof.totalAreaMm2, reference.expectedSurfaceAreaMm2, ENGINEERING_AREA_TOLERANCE_MM2);
    expect(roof.planes.every((plane) => plane.pitchDegrees === reference.expectedPitchDegrees)).toBe(true);
    for (const [kind, expected] of Object.entries(reference.expectedEdgeLengthMm)) {
      const actual = roof.edges.filter((edge) => edge.kind === kind).reduce((sum, edge) => sum + edge.lengthMm, 0);
      expectNear(actual, expected, ENGINEERING_LENGTH_TOLERANCE_MM);
    }
  });

  it.each(ROOF_ENGINEERING_REFERENCES)("reconciles every plane by independent 2D and 3D vector area: $name", (reference) => {
    const roof = calculateRoofGeometry(reference.input);
    for (const plane of roof.planes) {
      expectNear(projectedArea(plane.vertices), plane.projectedAreaMm2, ENGINEERING_AREA_TOLERANCE_MM2);
      expectNear(polygonArea3d(plane.vertices), plane.areaMm2, ENGINEERING_AREA_TOLERANCE_MM2);
      expect(hasProperSelfIntersection(plane.vertices)).toBe(false);
    }
    expectNear(roof.planes.reduce((sum, plane) => sum + plane.projectedAreaMm2, 0), roof.projectedAreaMm2, ENGINEERING_AREA_TOLERANCE_MM2);
    expectNear(roof.planes.reduce((sum, plane) => sum + plane.areaMm2, 0), roof.totalAreaMm2, ENGINEERING_AREA_TOLERANCE_MM2);
  });

  it.each(ROOF_ENGINEERING_REFERENCES)("keeps edge endpoints on every declared adjacent plane: $name", (reference) => {
    const roof = calculateRoofGeometry(reference.input);
    for (const edge of roof.edges) {
      expect(edge.adjacentPlaneIds).toHaveLength(edge.kind === "ridge" || edge.kind === "hip" || edge.kind === "valley" ? 2 : 1);
      for (const planeId of edge.adjacentPlaneIds) {
        const plane = roof.planes.find((candidate) => candidate.id === planeId);
        expect(plane, `${edge.id} references missing plane ${planeId}`).toBeDefined();
        expect(isOnBoundary(edge.start, plane!.vertices), `${edge.id} start is outside ${planeId}`).toBe(true);
        expect(isOnBoundary(edge.end, plane!.vertices), `${edge.id} end is outside ${planeId}`).toBe(true);
      }
    }
  });

  it.each(ROOF_ENGINEERING_REFERENCES)("obeys linear and quadratic scaling: $name", (reference) => {
    const factor = 3;
    const base = calculateRoofGeometry(reference.input);
    const scaled = calculateRoofGeometry(scaleInput(reference.input, factor));
    expectNear(scaled.projectedAreaMm2, base.projectedAreaMm2 * factor ** 2, ENGINEERING_AREA_TOLERANCE_MM2);
    expectNear(scaled.totalAreaMm2, base.totalAreaMm2 * factor ** 2, ENGINEERING_AREA_TOLERANCE_MM2);
    for (const kind of ["eave", "upper", "ridge", "rake", "hip", "valley"] as const) {
      const baseLength = base.edges.filter((edge) => edge.kind === kind).reduce((sum, edge) => sum + edge.lengthMm, 0);
      const scaledLength = scaled.edges.filter((edge) => edge.kind === kind).reduce((sum, edge) => sum + edge.lengthMm, 0);
      expectNear(scaledLength, baseLength * factor, ENGINEERING_LENGTH_TOLERANCE_MM);
    }
  });

  it("rejects dimensions that could create infeasible parameterized footprints", () => {
    const invalid: readonly unknown[] = [
      { type: "shed", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 0 },
      { type: "hip", lengthMm: 6_000, widthMm: 6_000, pitchDegrees: 45 },
      { type: "halfHip", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 45, hipEaveHeightMm: 3_000 },
      { type: "lShape", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 45, wingWidthMm: 6_000, wingProjectionMm: 5_000 },
      { type: "tShape", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 45, wingWidthMm: 4_000, wingProjectionMm: -1 },
    ];
    invalid.forEach((input) => expect(roofGeometryInputSchema.safeParse(input).success).toBe(false));
  });
});
