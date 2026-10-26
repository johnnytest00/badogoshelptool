import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, type RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { calculateRafterJoints } from "./rafter-joints";
import { birdsmouthLines, calculatePlaneBirdsmouths, planeJointStatuses, roofSectionViews } from "./plane-birdsmouth";

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
    expect(calculatePlaneBirdsmouths(geometry, layout, {})[0]).toMatchObject({ status: "incomplete", missing: ["Szarufa keresztmetszet magassága", "HAP · szarufa felső élének magassága a talpszelemen felett"] });
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
    expect(lines.every((line) => line.label.startsWith("KARMI · 36,87°"))).toBe(true);
    expect(birdsmouthLines(calculatePlaneBirdsmouths(geometry, layout, {}))).toEqual([]);
  });

  it("takes 45° with h 200 and HAP 100 to the hand values (independent of the production formula)", () => {
    const { geometry, layout } = layoutFor(HIP);
    const seat = calculatePlaneBirdsmouths(geometry, layout, input)[0]!.seat;
    // v = h/cosα − k = 282,8427 − 100; b = v/tanα; d = v·cosα = h − k·cosα; r = k·cosα.
    for (const [label, expected] of [["Függővágás magassága", 182.8427], ["Vízszintes ülékhossz", 182.8427], ["Bevágás mélysége", 129.2893], ["Megmaradó", 70.7107]] as const) expect(value(seat, label)).toBeCloseTo(expected, 3);
  });
});

/** M9.5 support matrix (CRR-06): per shape, which joint each eave plane gets. purlin and ridge purlin given roof-wide. */
describe("rafter joints per roof shape (M9.5)", () => {
  const R = { lengthMm: 10_000, widthMm: 8_000, pitchDegrees: 40 };
  // 40°, run 4000: upper edge at x is 100 + x·tan40, lower edge 100 + x·tan40 − 200/cos40; supports sit 40–100 mm above the lower edge.
  const tan = Math.tan(40 * Math.PI / 180), H = 200 / Math.cos(40 * Math.PI / 180);
  const joints = { ...input, purlinFaceMm: 2000, purlinTopMm: Math.round(100 + 2000 * tan - H + 80), ridgeJoint: "purlin" as const, ridgePurlinWidthMm: 160, ridgePurlinTopMm: Math.round(100 + 3920 * tan - H + 40) };
  const matrix: readonly (readonly [string, RoofGeometryInput, readonly string[], number])[] = [
    // [shape, input, per plane "seat/purlin/ridge" state, overview sections]
    ["gable", { type: "gable", geometry: { inputMode: "angle", buildingLengthMm: 10_000, buildingWidthMm: 8_000, roofPitchDegrees: 40, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } } as RoofGeometryInput, ["computed/computed/computed", "computed/computed/computed"], 1],
    ["shed", { type: "shed", lengthMm: 10_000, widthMm: 4_000, pitchDegrees: 40 }, ["computed/computed/unsupported"], 1],
    ["hip", { type: "hip", ...R }, ["computed/computed/computed", "computed/computed/computed", "computed/computed/unsupported", "computed/computed/unsupported"], 3],
    ["pyramid", { type: "pyramid", sideMm: 8_000, pitchDegrees: 40 }, ["computed/computed/unsupported", "computed/computed/unsupported", "computed/computed/unsupported", "computed/computed/unsupported"], 4],
    ["halfHip", { type: "halfHip", ...R, hipEaveHeightMm: 1_000 }, ["computed/computed/computed", "computed/computed/computed", "computed/unsupported/unsupported", "computed/unsupported/unsupported"], 3],
    ["lShape", { type: "lShape", ...R, wingWidthMm: 5_000, wingProjectionMm: 4_000 }, ["computed/unsupported/unsupported", "computed/unsupported/unsupported", "computed/computed/computed", "computed/computed/computed"], 3],
    ["tShape", { type: "tShape", ...R, wingWidthMm: 5_000, wingProjectionMm: 4_000 }, ["computed/computed/computed", "computed/computed/computed", "computed/unsupported/unsupported", "computed/unsupported/unsupported"], 3],
    // The lower planes' purlin is invalid at these inputs, but their seat and outline are proven, so each is drawn on its own (they meet at the break line, not a shared ridge).
    ["mansard", { type: "mansard", lengthMm: 10_000, widthMm: 8_000, lowerRunMm: 1_000, lowerRiseMm: 2_000, upperRiseMm: 1_000 }, ["computed/invalid/unsupported", "computed/invalid/unsupported", "not-applicable", "not-applicable"], 2],
  ];
  it.each(matrix)("%s", (_shape, roof, expected, sections) => {
    const { geometry, layout } = layoutFor(roof);
    const planes = calculatePlaneBirdsmouths(geometry, layout, joints);
    expect(planes.map((plane) => plane.joints ? plane.joints.joints.map((joint) => joint.status).join("/") : plane.status)).toEqual(expected);
    // Hip and valley rafters never get a common-rafter cut: they are not in the layout and every hip/valley end is unsupported.
    for (const plane of planes) for (const joint of plane.joints?.joints ?? []) if (joint.status === "unsupported") expect(joint.values).toEqual([]);
    expect(roofSectionViews(planes)).toHaveLength(sections);
    // Every state survives into the saved provenance, with its reason.
    const statuses = planeJointStatuses(planes);
    expect(statuses.filter((item) => item.status === "unsupported" || item.status === "not-applicable").every((item) => (item.reason ?? "").length > 0)).toBe(true);
  });

  it("pairs only opposite planes of one ridge and keeps each side's own result", () => {
    const { geometry, layout } = layoutFor(GABLE);
    const planes = calculatePlaneBirdsmouths(geometry, layout, input);
    const [view] = roofSectionViews(planes);
    expect(view!.planes.map((plane) => plane.planeId)).toEqual(["left-plane", "right-plane"]);
    expect(view!.planes[0]!.joints).not.toBe(view!.planes[1]!.joints);
    expect(view!.planes[0]!.direction.x * view!.planes[1]!.direction.x + view!.planes[0]!.direction.y * view!.planes[1]!.direction.y).toBeCloseTo(-1, 9);
  });

  it("names a ridge board and a ridge purlin for what they are and saves their lines once per pitch", () => {
    const { geometry, layout } = layoutFor(GABLE);
    const board = calculatePlaneBirdsmouths(geometry, layout, { ...input, ridgeJoint: "board", ridgeBoardThicknessMm: 40 });
    expect(planeJointStatuses(board).map((item) => item.name)).toEqual(["Talpszelemen", "Gerincdeszka", "Talpszelemen", "Gerincdeszka"]);
    const lines = birdsmouthLines(board).map((line) => line.label);
    expect(lines.filter((label) => label.startsWith("Gerincdeszka · 36,87°"))).toEqual(["Gerincdeszka · 36,87° · Vízszintes futás csökkenése (t/2)", "Gerincdeszka · 36,87° · Hosszcsökkenés a szarufa felső éle mentén", "Gerincdeszka · 36,87° · Szarufa teljes hossza gerincdeszkával"]);
    expect(calculatePlaneBirdsmouths(geometry, layout, { ...input, ridgeJoint: "board", ridgeBoardThicknessMm: 0 })[0]!.joints!.joints[1]).toMatchObject({ status: "invalid" });
  });
});
