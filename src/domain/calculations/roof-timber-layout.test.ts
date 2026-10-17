import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometryInput } from "./roof-geometry";
import { calculateRoofTimberLayout } from "./roof-timber-layout";
import { geometryFromSurveyMeasurements } from "@/domain/field-surveys/roof-geometry";

const DEMO_M = 1000;
const DEMO_ROOFS: readonly RoofGeometryInput[] = [
  { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10 * DEMO_M, buildingWidthMm: 6 * DEMO_M, roofRiseMm: 4 * DEMO_M, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } },
  { type: "shed", lengthMm: 10 * DEMO_M, widthMm: 6 * DEMO_M, pitchDegrees: 45 },
  { type: "hip", lengthMm: 10 * DEMO_M, widthMm: 6 * DEMO_M, pitchDegrees: 45 },
  { type: "pyramid", sideMm: 6 * DEMO_M, pitchDegrees: 45 },
  { type: "halfHip", lengthMm: 10 * DEMO_M, widthMm: 6 * DEMO_M, pitchDegrees: 45, hipEaveHeightMm: DEMO_M },
  { type: "lShape", lengthMm: 10 * DEMO_M, widthMm: 6 * DEMO_M, pitchDegrees: 45, wingWidthMm: 4 * DEMO_M, wingProjectionMm: 5 * DEMO_M },
  { type: "tShape", lengthMm: 10 * DEMO_M, widthMm: 6 * DEMO_M, pitchDegrees: 45, wingWidthMm: 4 * DEMO_M, wingProjectionMm: 5 * DEMO_M },
];
const rafter = { maxSpacingMm: 2500, startInsetMm: 0, endInsetMm: 0, sectionWidthMm: 50, sectionHeightMm: 150 };
const batten = { maxSpacingMm: 1000, startInsetMm: 0, endInsetMm: 0, sectionWidthMm: 30, sectionHeightMm: 100 };

describe("roof rafter and batten geometric layout", () => {
  it("independently checks rectangular gable lengths, positions, spacing and volumes", () => {
    const result = calculateRoofTimberLayout(calculateRoofGeometry(DEMO_ROOFS[0]), { rafter, batten });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.rafters).toMatchObject({ count: 10, actualSpacingMm: 2500, totalLengthMm: 50_000, sectionAreaMm2: 7500, nominalVolumeM3: .375 });
    expect(result.rafters?.positionsMm).toEqual([0, 0, 2500, 2500, 5000, 5000, 7500, 7500, 10000, 10000]);
    expect(result.battens).toMatchObject({ count: 11, totalLengthMm: 110_000, sectionAreaMm2: 3000, nominalVolumeM3: .33 });
    expect(result.battens?.actualSpacingMm).toBeCloseTo(1000, 8);
    result.rafters?.segments.forEach((segment) => expect(segment.lengthMm).toBeCloseTo(5000, 6));
  });

  it("uses roof-surface distance and independently checks the single-pitch fixture", () => {
    const geometry = calculateRoofGeometry(DEMO_ROOFS[1]);
    const result = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 2500, startInsetMm: 0, endInsetMm: 0 }, batten: { maxSpacingMm: 2000, startInsetMm: 0, endInsetMm: 0 } });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.rafters?.count).toBe(5);
    expect(result.rafters?.totalLengthMm).toBeCloseTo(5 * 6000 * Math.SQRT2, 7);
    expect(result.battens?.count).toBe(6);
    expect(result.battens?.actualSpacingMm).toBeCloseTo(6_000 * Math.SQRT2 / 5, 6);
    expect(result.battens?.segments[0].lengthMm).toBeCloseTo(10_000, 6);
  });

  it("independently verifies hip and pyramid rafter boundary clipping", () => {
    const hip = calculateRoofTimberLayout(calculateRoofGeometry(DEMO_ROOFS[2]), { rafter });
    expect(hip.status).toBe("available");
    if (hip.status !== "available") return;
    const hipExpected = 4 * 2500 * Math.SQRT2 + 2 * 3000 * Math.SQRT2 + 4 * 2000 * Math.SQRT2;
    expect(hip.rafters?.count).toBe(10);
    expect(hip.rafters?.totalLengthMm).toBeCloseTo(hipExpected, 7);

    const pyramid = calculateRoofTimberLayout(calculateRoofGeometry(DEMO_ROOFS[3]), { rafter });
    expect(pyramid.status).toBe("available");
    if (pyramid.status !== "available") return;
    expect(pyramid.rafters?.count).toBe(8);
    expect(pyramid.rafters?.totalLengthMm).toBeCloseTo(8 * 2000 * Math.SQRT2, 7);

    const halfHip = calculateRoofTimberLayout(calculateRoofGeometry(DEMO_ROOFS[4]), { rafter });
    expect(halfHip.status).toBe("available");
    if (halfHip.status !== "available") return;
    const halfHipExpected = 4 * 1000 * Math.SQRT2 + 6 * 3000 * Math.SQRT2 + 2 * 2000 * Math.SQRT2;
    expect(halfHip.rafters?.count).toBe(12);
    expect(halfHip.rafters?.totalLengthMm).toBeCloseTo(halfHipExpected, 7);
  });

  it("produces equivalent quantities from Survey and standalone roof geometry", () => {
    const surveyInput = geometryFromSurveyMeasurements("shed", [
      { id: "00000000-0000-4000-8000-000000000201", label: "DEMO külső hossz", value: 10, unit: "m", semanticType: "roof_outer_length" },
      { id: "00000000-0000-4000-8000-000000000202", label: "DEMO külső szélesség", value: 6, unit: "m", semanticType: "roof_outer_width" },
      { id: "00000000-0000-4000-8000-000000000203", label: "DEMO hajlás", value: 45, unit: "degree", semanticType: "roof_pitch" },
    ]);
    expect(surveyInput).not.toBeNull();
    const surveyResult = calculateRoofTimberLayout(calculateRoofGeometry(surveyInput!), { rafter, batten });
    const standaloneResult = calculateRoofTimberLayout(calculateRoofGeometry(DEMO_ROOFS[1]), { rafter, batten });
    expect(surveyResult).toEqual(standaloneResult);
  });

  it.each(DEMO_ROOFS.slice(2))("calculates clipped and non-overlapping lines for %s geometry", (input) => {
    const geometry = calculateRoofGeometry(input);
    const result = calculateRoofTimberLayout(geometry, { rafter, batten });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.rafters?.count).toBeGreaterThan(0);
    expect(result.battens?.count).toBeGreaterThan(0);
    expect(result.rafters?.totalLengthMm).toBeGreaterThan(0);
    expect(result.battens?.totalLengthMm).toBeGreaterThan(0);
    expect(result.rafters?.segments.every((segment) => Number.isFinite(segment.lengthMm) && segment.lengthMm > 0)).toBe(true);
    expect(result.battens?.segments.every((segment) => Number.isFinite(segment.lengthMm) && segment.lengthMm > 0)).toBe(true);
    const segments = [...(result.rafters?.segments ?? []), ...(result.battens?.segments ?? [])];
    const keys = segments.map((segment) => [segment.start, segment.end].map((point) => `${point.xMm.toFixed(4)},${point.yMm.toFixed(4)},${point.zMm.toFixed(4)}`).sort().join("|"));
    console.log(input.type, keys.filter((key, index) => keys.indexOf(key) !== index).map((key) => segments[keys.indexOf(key)]));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("honors explicit perimeters and returns unavailable for invalid spacing or a perimeter that leaves no span", () => {
    const geometry = calculateRoofGeometry(DEMO_ROOFS[1]);
    const input = (overrides: Partial<typeof rafter>) => ({ rafter: { ...rafter, ...overrides } });
    expect(calculateRoofTimberLayout(geometry, input({ startInsetMm: 1000, endInsetMm: 1000 })).status).toBe("available");
    expect(calculateRoofTimberLayout(geometry, input({ maxSpacingMm: 0 })).status).toBe("unavailable");
    expect(calculateRoofTimberLayout(geometry, input({ startInsetMm: 6000, endInsetMm: 6000 })).status).toBe("unavailable");
    expect(calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 1000, startInsetMm: 0, endInsetMm: 0, sectionWidthMm: 50 } }).status).toBe("unavailable");
  });

  it("returns unavailable when the requested layout exceeds the bounded drawing capacity", () => {
    const geometry = calculateRoofGeometry(DEMO_ROOFS[1]);
    expect(calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 1, startInsetMm: 0, endInsetMm: 0 } }).status).toBe("unavailable");
  });
});
