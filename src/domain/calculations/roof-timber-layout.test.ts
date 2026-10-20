import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometry, type RoofGeometryInput, type RoofPoint } from "./roof-geometry";
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
type ManualPolygon = Readonly<{ id: string; points: readonly (readonly [number, number, number])[] }>;
const MANUAL_L_T_POLYGONS: Readonly<Record<"lShape" | "tShape", readonly ManualPolygon[]>> = {
  lShape: [
    { id: "wing-west-0", points: [[0,-5000,0],[2000,-5000,2000],[2000,0,2000],[0,0,0]] },
    { id: "wing-east-1", points: [[2000,-5000,2000],[4000,-5000,0],[4000,0,0],[2000,0,2000]] },
    { id: "main-south-2", points: [[0,0,0],[2000,2000,2000],[2000,3000,3000],[0,3000,3000]] },
    { id: "wing-west-3", points: [[0,0,0],[2000,0,2000],[2000,2000,2000]] },
    { id: "main-south-4", points: [[4000,0,0],[4000,3000,3000],[2000,3000,3000],[2000,2000,2000]] },
    { id: "wing-east-5", points: [[2000,0,2000],[4000,0,0],[2000,2000,2000]] },
    { id: "main-north-6", points: [[0,3000,3000],[4000,3000,3000],[4000,6000,0],[0,6000,0]] },
    { id: "main-south-7", points: [[4000,0,0],[10000,0,0],[10000,3000,3000],[4000,3000,3000]] },
    { id: "main-north-8", points: [[4000,3000,3000],[10000,3000,3000],[10000,6000,0],[4000,6000,0]] },
  ],
  tShape: [
    { id: "main-south-0", points: [[0,0,0],[3000,0,0],[3000,3000,3000],[0,3000,3000]] },
    { id: "main-north-1", points: [[0,3000,3000],[3000,3000,3000],[3000,6000,0],[0,6000,0]] },
    { id: "wing-west-2", points: [[3000,-5000,0],[5000,-5000,2000],[5000,0,2000],[3000,0,0]] },
    { id: "wing-east-3", points: [[5000,-5000,2000],[7000,-5000,0],[7000,0,0],[5000,0,2000]] },
    { id: "main-south-4", points: [[3000,0,0],[5000,2000,2000],[5000,3000,3000],[3000,3000,3000]] },
    { id: "wing-west-5", points: [[3000,0,0],[5000,0,2000],[5000,2000,2000]] },
    { id: "main-south-6", points: [[7000,0,0],[7000,3000,3000],[5000,3000,3000],[5000,2000,2000]] },
    { id: "wing-east-7", points: [[5000,0,2000],[7000,0,0],[5000,2000,2000]] },
    { id: "main-north-8", points: [[3000,3000,3000],[7000,3000,3000],[7000,6000,0],[3000,6000,0]] },
    { id: "main-south-9", points: [[7000,0,0],[10000,0,0],[10000,3000,3000],[7000,3000,3000]] },
    { id: "main-north-10", points: [[7000,3000,3000],[10000,3000,3000],[10000,6000,0],[7000,6000,0]] },
  ],
};
function manualLTGeometry(type: "lShape" | "tShape"): RoofGeometry {
  const planes = MANUAL_L_T_POLYGONS[type].map(({ id, points }) => ({
    id,
    vertices: points.map(([xMm, yMm, zMm]): RoofPoint => ({ xMm, yMm, zMm })),
    areaMm2: 1,
    projectedAreaMm2: 1,
    pitchDegrees: 45,
  }));
  return { type, modelVersion: "1.0.0", planes, edges: [], totalAreaMm2: 1, projectedAreaMm2: 1 };
}

describe("roof rafter and batten geometric layout", () => {
  it("independently checks rectangular gable lengths, positions, spacing and volumes", () => {
    const result = calculateRoofTimberLayout(calculateRoofGeometry(DEMO_ROOFS[0]), { rafter, batten });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.quantityClassification).toBe("verified-geometric-quantity");
    expect(result.physicalLayout.status).toBe("unsupported");
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

  it("lays rafters on both mansard pitches", () => {
    const geometry = calculateRoofGeometry({ type: "mansard", lengthMm: 10 * DEMO_M, widthMm: 6 * DEMO_M, lowerRunMm: 1_500, lowerRiseMm: 2_800, upperRiseMm: 700 });
    const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 1_000, startInsetMm: 0, endInsetMm: 0, sectionWidthMm: 50, sectionHeightMm: 150 } });
    expect(layout.status).toBe("available");
    if (layout.status !== "available") return;
    // Four plane groups, each spanning the full 10 m length at 1 m spacing: 11 rafter lines per group.
    expect(layout.rafters?.count).toBe(44);
    const expected = 2 * 11 * (Math.hypot(1_500, 2_800) + Math.hypot(1_500, 700));
    expect(layout.rafters?.totalLengthMm).toBeCloseTo(expected, 6);
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

  it.each(DEMO_ROOFS.slice(2))("calculates clipped geometric lines for %s geometry", (input) => {
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
    for (const family of [result.rafters, result.battens]) {
      if (!family) continue;
      const keys = family.segments.map((segment) => [segment.start, segment.end].map((point) => `${point.xMm.toFixed(4)},${point.yMm.toFixed(4)},${point.zMm.toFixed(4)}`).sort().join("|"));
      expect(new Set(keys).size).toBe(keys.length);
      expect(family.planeLayouts.every((layout) => layout.actualSpacingMm <= (family === result.rafters ? rafter.maxSpacingMm : batten.maxSpacingMm) + 1e-6)).toBe(true);
    }
  });

  it.each(["lShape", "tShape"] as const)("independently verifies %s clipping, spacing and units from hand-derived coordinates", (type) => {
    const result = calculateRoofTimberLayout(manualLTGeometry(type), {
      rafter,
      batten: { ...batten, sectionWidthMm: 30, sectionHeightMm: 100 },
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;

    // Rafter oracle: L main faces contribute (13.5 + 15)k√2; T contributes
    // (13 + 15)k√2. The four wing faces together contribute 12k√2.
    const expectedRafterLength = type === "lShape" ? 40_500 * Math.SQRT2 : 40_000 * Math.SQRT2;
    expect(result.rafters?.count).toBe(16);
    expect(result.rafters?.totalLengthMm).toBeCloseTo(expectedRafterLength, 6);
    expect(result.rafters?.planeLayouts.map((layout) => layout.actualSpacingMm).every((spacing) => spacing <= 2500)).toBe(true);

    // Batten oracle from the independently measured 45° polygon cuts:
    // main south rows total 51.2m, main north 50m, west wing 24m, east wing 17m.
    expect(result.battens?.count).toBe(18);
    expect(result.battens?.totalLengthMm).toBe(142_200);
    expect(result.battens?.nominalVolumeM3).toBeCloseTo(0.4266, 8);
    expect(result.battens?.planeLayouts.map((layout) => layout.actualSpacingMm).every((spacing) => spacing <= 1000 + 1e-6)).toBe(true);
  });

  it("applies start and end insets in the declared horizontal and roof-surface units", () => {
    const geometry = calculateRoofGeometry(DEMO_ROOFS[1]);
    const result = calculateRoofTimberLayout(geometry, {
      rafter: { maxSpacingMm: 2500, startInsetMm: 1000, endInsetMm: 500 },
      batten: { maxSpacingMm: 2000, startInsetMm: 500, endInsetMm: 500 },
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.rafters?.positionsMm).toEqual([1000, 3125, 5250, 7375, 9500]);
    expect(result.rafters?.actualSpacingMm).toBe(2125);
    expect(result.battens?.positionsMm[0]).toBeCloseTo(500, 6);
    expect(result.battens?.positionsMm.at(-1)).toBeCloseTo(6000 * Math.SQRT2 - 500, 6);
    expect(result.battens?.actualSpacingMm).toBeCloseTo((6000 * Math.SQRT2 - 1000) / 4, 6);
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
