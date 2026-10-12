import { describe, expect, it } from "vitest";
import {
  centimeters,
  cmToMm,
  cubicMmToM,
  cubicMillimeters,
  degrees,
  degreesToRadians,
  mToMm,
  meters,
  millimeters,
  mmToCm,
  mmToM,
  radiansToDegrees,
  squareMmToM,
  squareMillimeters,
} from "@/domain/measurements/units";

describe("measurement units", () => {
  it("converts canonical lengths explicitly", () => {
    expect(cmToMm(centimeters(200))).toBe(2000);
    expect(mToMm(meters(3))).toBe(3000);
    expect(mmToCm(millimeters(2000))).toBe(200);
    expect(mmToM(millimeters(2000))).toBe(2);
  });

  it("converts areas, volumes and angles without dimensional mixing", () => {
    expect(squareMmToM(squareMillimeters(6_000_000))).toBe(6);
    expect(cubicMmToM(cubicMillimeters(1_000_000_000))).toBe(1);
    expect(degreesToRadians(degrees(90))).toBeCloseTo(Math.PI / 2);
    expect(radiansToDegrees(degreesToRadians(degrees(90)))).toBeCloseTo(90);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("rejects non-finite values: %s", (value) => {
    expect(() => millimeters(value)).toThrow(/finite/);
    expect(() => meters(value)).toThrow(/finite/);
  });

  it("rejects unsafe canonical integers", () => {
    expect(() => millimeters(Number.MAX_SAFE_INTEGER + 1)).toThrow(/safe integer/);
  });
});
