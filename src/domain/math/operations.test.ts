import { describe, expect, it } from "vitest";
import { millimeters } from "@/domain/measurements/units";
import {
  nearlyEqual,
  rectangleArea,
  rightTriangleHypotenuse,
  rightTriangleLeg,
  triangleArea,
} from "@/domain/math/operations";

describe("domain math", () => {
  it("matches the independently known 3-4-5 triangle", () => {
    expect(rightTriangleHypotenuse(millimeters(3000), millimeters(4000))).toBe(5000);
    expect(rightTriangleLeg(millimeters(5000), millimeters(4000))).toBe(3000);
  });

  it("calculates reference areas in canonical mm²", () => {
    expect(rectangleArea(millimeters(2000), millimeters(3000))).toBe(6_000_000);
    expect(triangleArea(millimeters(3000), millimeters(4000))).toBe(6_000_000);
  });

  it("keeps precision policy explicit", () => {
    expect(nearlyEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(() => rectangleArea(millimeters(Number.MAX_SAFE_INTEGER), millimeters(2))).toThrow(/safe numeric bounds/);
  });
});
