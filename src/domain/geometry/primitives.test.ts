import { describe, expect, it } from "vitest";
import {
  cross2D,
  distance2D,
  distance3D,
  dot2D,
  lineSegment2D,
  midpoint2D,
  normalize2D,
  point2D,
  point3D,
  polygon2D,
  polygonArea,
  polygonPerimeter,
  projectPointToSegment,
  segmentLength2D,
  translate2D,
  vector2D,
  vector3D,
} from "@/domain/geometry/primitives";

describe("geometry primitives", () => {
  it("calculates distances and preserves symmetry", () => {
    const a = point2D(0, 0);
    const b = point2D(3000, 4000);
    expect(distance2D(a, b)).toBe(5000);
    expect(distance2D(a, b)).toBe(distance2D(b, a));
    expect(distance3D(point3D(0, 0, 0), point3D(2, 3, 6))).toBe(7);
  });

  it("supports vector, midpoint, translation and projection operations", () => {
    expect(dot2D(vector2D(1, 0), vector2D(0, 1))).toBe(0);
    expect(cross2D(vector2D(1, 0), vector2D(0, 1))).toBe(1);
    expect(normalize2D(vector2D(3000, 4000))).toEqual({ x: 0.6, y: 0.8 });
    expect(midpoint2D(point2D(0, 0), point2D(11, 9))).toEqual(point2D(6, 5));
    expect(translate2D(point2D(10, 20), vector2D(5, -10))).toEqual(point2D(15, 10));
    const segment = lineSegment2D(point2D(0, 0), point2D(100, 0));
    expect(segmentLength2D(segment)).toBe(100);
    expect(projectPointToSegment(point2D(40, 30), segment)).toEqual(point2D(40, 0));
  });

  it("calculates a rectangle area and perimeter", () => {
    const polygon = polygon2D([point2D(0, 0), point2D(2000, 0), point2D(2000, 3000), point2D(0, 3000)]);
    expect(polygonArea(polygon)).toBe(6_000_000);
    expect(polygonPerimeter(polygon)).toBe(10_000);
    expect(polygonArea(polygon)).toBe(polygonArea(polygon2D(polygon.points.map((point) => translate2D(point, vector2D(100, 500))))));
  });

  it("rejects invalid geometry instead of returning plausible results", () => {
    expect(() => lineSegment2D(point2D(0, 0), point2D(0, 0))).toThrow(/coincident/);
    expect(() => normalize2D(vector2D(0, 0))).toThrow(/zero vector/);
    expect(() => polygon2D([point2D(0, 0), point2D(1, 1)])).toThrow(/three points/);
    expect(() => polygon2D([point2D(0, 0), point2D(100, 100), point2D(200, 200)])).toThrow(/zero area/);
    expect(() => polygon2D([point2D(0, 0), point2D(100, 100), point2D(0, 100), point2D(100, 0)])).toThrow(/self-intersect/);
  });

  it("rejects non-finite or non-integer millimetre coordinates", () => {
    expect(() => point2D(Number.NaN, 0)).toThrow(/finite/);
    expect(() => point3D(0, 1.5, 0)).toThrow(/safe integer/);
    expect(() => vector3D(0, 0, Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });
});
