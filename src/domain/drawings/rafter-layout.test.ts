import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, type RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { createRafterLayoutModel } from "./rafter-layout";

// Independent hand values: 10 × 6 m gable, 4 m rise → 3-4-5, rafter 5000 mm, pitch atan(4/3) = 53,13°, 10 000 / 17 = 588,24 mm.
const GABLE: RoofGeometryInput = { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } };
// 45° hip: common rafters 3000 / cos45 = 4242,64 mm; jack rafters near the hips are shorter and end on a hip.
const HIP: RoofGeometryInput = { type: "hip", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 45 };

function layoutFor(input: RoofGeometryInput, maxSpacingMm = 600) {
  const geometry = calculateRoofGeometry(input);
  const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm, startInsetMm: 0, endInsetMm: 0 } });
  if (layout.status !== "available") throw new Error(layout.reason);
  return { geometry, layout: layout as RoofTimberLayout };
}

describe("rafter layout (true-size roof plane with numbered rafters)", () => {
  it("numbers the rafters of a gable plane by their place from the first one, all 5000 mm long", () => {
    const { geometry, layout } = layoutFor(GABLE);
    const model = createRafterLayoutModel(geometry, layout)!;
    const plane = model.plane;
    expect(plane.rafters).toHaveLength(18);
    expect(plane.rafters.map((rafter) => rafter.number)).toEqual(Array.from({ length: 18 }, (_, index) => index + 1));
    expect(plane.rafters[1]!.offsetMm).toBeCloseTo(10_000 / 17, 6);
    expect(plane.rafters.at(-1)!.offsetMm).toBeCloseTo(10_000, 6);
    expect(plane.spacingMm).toBeCloseTo(10_000 / 17, 6);
    expect(plane.lengthGroups).toEqual([{ lengthMm: 5000, count: 18 }]);
    // True size: the plane is 10 000 wide and 5000 along the slope; each rafter runs from the eave (s = 0) to the ridge.
    expect(plane.bounds.maxX - plane.bounds.minX).toBeCloseTo(10_000, 6);
    expect(plane.bounds.maxY - plane.bounds.minY).toBeCloseTo(5000, 6);
    expect(plane.rafters[0]!.from.y).toBeCloseTo(0, 6);
    expect(plane.rafters[0]!.to.y).toBeCloseTo(5000, 6);
    expect(plane.pitchDegrees).toBeCloseTo(53.130102, 5);
  });

  it("gives the ridge end a plumb cut angle to the rafter edge (90° − pitch) and no invented eave notch", () => {
    const { geometry, layout } = layoutFor(GABLE);
    const rafter = createRafterLayoutModel(geometry, layout)!.plane.rafters[0]!;
    expect(rafter.upperEnd).toMatchObject({ edgeKind: "ridge", plumbAngleDegrees: expect.closeTo(36.869898, 5) });
    expect(rafter.lowerEnd).toMatchObject({ edgeKind: "eave", plumbAngleDegrees: null });
  });

  it("marks hip-ended jack rafters as an unsupported compound cut and groups the different lengths", () => {
    const { geometry, layout } = layoutFor(HIP);
    const model = createRafterLayoutModel(geometry, layout)!;
    expect(model.planes.length).toBeGreaterThan(1);
    const rafters = model.plane.rafters;
    expect(rafters.some((rafter) => rafter.upperEnd.edgeKind === "hip" && rafter.upperEnd.plumbAngleDegrees === null)).toBe(true);
    expect(rafters.some((rafter) => rafter.upperEnd.edgeKind === "ridge" && Math.abs(rafter.lengthMm - 3000 / Math.cos(Math.PI / 4)) < 1e-6)).toBe(true);
    expect(model.plane.lengthGroups.length).toBeGreaterThan(1);
    expect(model.plane.lengthGroups.reduce((sum, group) => sum + group.count, 0)).toBe(rafters.length);
  });

  it("selects another plane on request and returns null without rafters", () => {
    const { geometry, layout } = layoutFor(HIP);
    const other = createRafterLayoutModel(geometry, layout)!.planes.find((plane) => plane.count < 10)!;
    expect(createRafterLayoutModel(geometry, layout, other.planeId)!.plane.planeId).toBe(other.planeId);
    expect(createRafterLayoutModel(geometry, { ...layout, rafters: null })).toBeNull();
  });
});
