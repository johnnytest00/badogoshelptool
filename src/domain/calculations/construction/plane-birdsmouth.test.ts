import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, type RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { calculateRafterJoints } from "./rafter-joints";
import { birdsmouthLines, calculatePlaneBirdsmouths } from "./plane-birdsmouth";

// Same independent 3-4-5 hand values as rafter-joints.test.ts: tanα 0.75, h 200, HAP 100 → plumb 150, seat 200, ⊥120, remaining 80.
const GABLE: RoofGeometryInput = { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 8_000, roofRiseMm: 3_000, eaveOverhangMm: 400, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } };
// 45°: H = 200/cos45 = 282,84; plumb 182,84; seat 182,84; ⊥ 129,29; remaining 70,71.
const HIP: RoofGeometryInput = { type: "hip", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 45 };
const MANSARD: RoofGeometryInput = { type: "mansard", lengthMm: 10_000, widthMm: 8_000, lowerRunMm: 1_000, lowerRiseMm: 2_000, upperRiseMm: 1_000 };
const input = { rafterDepthMm: 200, seatCutHeightMm: 100 };

function layoutFor(roof: RoofGeometryInput) {
  const geometry = calculateRoofGeometry(roof);
  const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 600, startInsetMm: 0, endInsetMm: 0 } });
  if (layout.status !== "available") throw new Error(layout.reason);
  return { geometry, layout: layout as RoofTimberLayout };
}
const value = (seat: { values: readonly { label: string; value: number }[] } | null, label: string) => seat?.values.find((item) => item.label.startsWith(label))?.value;

describe("birdsmouth per roof plane (D1: roof plane = rafter upper edge, roof width edge = plate outer face)", () => {
  it("gives every eave plane of a gable the same notch as the rafter-cut calculator", () => {
    const { geometry, layout } = layoutFor(GABLE);
    const planes = calculatePlaneBirdsmouths(geometry, layout, input);
    expect(planes).toHaveLength(2);
    const reference = calculateRafterJoints({ horizontalHalfSpanMm: 4000, riseMm: 3100, eaveProjectionMm: 400, seatCutHeightMm: 100, rafterDepthMm: 200, ridgeJoint: "opposed" }).joints[0]!;
    for (const plane of planes) {
      expect(plane).toMatchObject({ status: "computed", eaveProjectionMm: expect.closeTo(400, 6), pitchDegrees: expect.closeTo(36.869898, 5) });
      for (const [label, expected] of [["Függővágás magassága", 150], ["Vízszintes ülékhossz", 200], ["Bevágás mélysége", 120], ["Megmaradó", 80]] as const) {
        expect(value(plane.seat, label)).toBeCloseTo(expected, 6);
        expect(value(plane.seat, label)).toBeCloseTo(value(reference, label)!, 9);
      }
    }
  });

  it("uses one notch for all rafters of a hip plane, including the jack rafters", () => {
    const { geometry, layout } = layoutFor(HIP);
    const planes = calculatePlaneBirdsmouths(geometry, layout, input);
    expect(planes).toHaveLength(4);
    for (const plane of planes) {
      expect(plane.status).toBe("computed");
      expect(value(plane.seat, "Függővágás magassága")).toBeCloseTo(200 * Math.SQRT2 - 100, 6);
      expect(value(plane.seat, "Vízszintes ülékhossz")).toBeCloseTo(200 * Math.SQRT2 - 100, 6);
    }
  });

  it("does not give a notch to mansard upper planes, whose rafters start at the break line", () => {
    const { geometry, layout } = layoutFor(MANSARD);
    const planes = calculatePlaneBirdsmouths(geometry, layout, input);
    expect(planes.filter((plane) => plane.status === "computed").length).toBeGreaterThan(0);
    expect(planes.some((plane) => plane.status === "not-applicable" && plane.reason?.includes("talpszelemen"))).toBe(true);
  });

  it("lists missing inputs and rejects a zero seat height", () => {
    const { geometry, layout } = layoutFor(GABLE);
    expect(calculatePlaneBirdsmouths(geometry, layout, {})[0]).toMatchObject({ status: "incomplete", missing: ["Szarufa keresztmetszet magassága", "Madárszáj vízszintes vágásának magassága"] });
    expect(calculatePlaneBirdsmouths(geometry, layout, { rafterDepthMm: 200, seatCutHeightMm: 0 })[0]).toMatchObject({ status: "invalid" });
  });

  it("checks only geometrically whether the seat fits on the plate", () => {
    const { geometry, layout } = layoutFor(GABLE);
    expect(calculatePlaneBirdsmouths(geometry, layout, { ...input, plateWidthMm: 160 })[0]!.plateFit).toEqual({ plateWidthMm: 160, seatMm: expect.closeTo(200, 9), fits: false, overhangMm: expect.closeTo(40, 9) });
    expect(calculatePlaneBirdsmouths(geometry, layout, { ...input, plateWidthMm: 250 })[0]!.plateFit).toMatchObject({ fits: true });
    expect(calculatePlaneBirdsmouths(geometry, layout, input)[0]!.plateFit).toBeNull();
  });

  it("writes one set of result lines per pitch, with unique labels", () => {
    const { geometry, layout } = layoutFor(GABLE);
    const lines = birdsmouthLines(calculatePlaneBirdsmouths(geometry, layout, input));
    expect(lines.map((line) => line.label)).toEqual([...new Set(lines.map((line) => line.label))]);
    expect(lines.find((line) => line.label.endsWith("Vízszintes ülékhossz"))).toMatchObject({ value: expect.closeTo(200, 9), unit: "mm" });
    expect(lines.every((line) => line.label.startsWith("Madárszáj · 36,87°"))).toBe(true);
    expect(birdsmouthLines(calculatePlaneBirdsmouths(geometry, layout, {}))).toEqual([]);
  });
});
