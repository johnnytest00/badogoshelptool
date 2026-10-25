import { describe, expect, it } from "vitest";
import { calculateRafterGeometry } from "@/domain/calculations/construction/roofs";
import { calculateRafterJoints, type RafterJointInput } from "@/domain/calculations/construction/rafter-joints";
import { createRafterJointDrawingModel, fitCamera, labelHitsSegment, nudgeOffSegments, panCamera, projectPoint, zoomCameraAt, type JointDimension, type MmPoint } from "./rafter-joint-drawing";

// Same independent 3-4-5 hand values as rafter-joints.test.ts: tanα 0.75, cosα 0.8, h 200, plumb depth 250, HAP 100.
const base: RafterJointInput = { horizontalHalfSpanMm: 4000, riseMm: 3100, eaveProjectionMm: 400, seatCutHeightMm: 100, rafterDepthMm: 200, ridgeJoint: "opposed" };
const three: RafterJointInput = { ...base, purlinFaceMm: 2000, purlinTopMm: 1400, ridgeJoint: "purlin", ridgePurlinWidthMm: 160, ridgePurlinTopMm: 2850 };
const measured = (dim: JointDimension) => dim.kind === "horizontal" ? Math.abs(dim.to.xMm - dim.from.xMm) : dim.kind === "vertical" ? Math.abs(dim.to.yMm - dim.from.yMm) : Math.hypot(dim.to.xMm - dim.from.xMm, dim.to.yMm - dim.from.yMm);
const dim = (dims: readonly JointDimension[], id: string) => dims.find((item) => item.id === id)!;

describe("rafter joint drawing model (S1/S2/S3 from calculateRafterJoints only)", () => {
  it("dimensions all three notches with the joint values, and every line is exactly as long as its label", () => {
    const joints = calculateRafterJoints(three);
    const model = createRafterJointDrawingModel(joints);
    expect(model.slots.map((slot) => [slot.slot, slot.name, slot.status])).toEqual([["S1", "Talpszelemen", "computed"], ["S2", "Derékszelemen", "computed"], ["S3", "Gerincszelemen", "computed"]]);
    const [s1, s2, s3] = model.slots;
    expect([dim(s1.dimensions, "S1-plumb").valueMm, dim(s1.dimensions, "S1-seat").valueMm, dim(s1.dimensions, "S1-depth").valueMm, dim(s1.dimensions, "S1-remaining").valueMm]).toEqual([150, 200, 120, 80].map((v) => expect.closeTo(v, 9)));
    expect(dim(s2.dimensions, "S2-depth").valueMm).toBeCloseTo(40, 9);
    expect([dim(s3.dimensions, "S3-plumb").valueMm, dim(s3.dimensions, "S3-seat").valueMm]).toEqual([expect.closeTo(60, 9), expect.closeTo(80, 9)]);
    for (const item of [...model.slots.flatMap((slot) => slot.dimensions), ...model.section!.overview]) expect(measured(item)).toBeCloseTo(item.valueMm, 6);
    // The table values are the same numbers, not a second computation.
    const tableValue = (id: string, label: string) => joints.joints.find((joint) => joint.id === id)!.values.find((item) => item.label.startsWith(label))!.value;
    expect(dim(s2.dimensions, "S2-seat").valueMm).toBe(tableValue("purlin", "Vízszintes ülékhossz"));
    expect(s1.angles.map((angle) => angle.valueDegrees)).toEqual([tableValue("seat", "Függővágás szöge"), tableValue("seat", "Ülékvágás szöge")]);
  });

  it("chains the plumb faces along the upper edge and the chain adds up to the calculator's rafter length", () => {
    const { overview } = createRafterJointDrawingModel(calculateRafterJoints(three)).section!;
    expect(overview.map((item) => [item.label, Number(item.valueMm.toFixed(6))])).toEqual([["eresz–S1", 500], ["S1–S2", 2500], ["S2–S3", 2400], ["S3–gerinc", 100], ["h ⊥", 200], ["L", 5500]]);
    const chain = overview.filter((item) => item.id.startsWith("chain-")).reduce((sum, item) => sum + item.valueMm, 0);
    expect(chain).toBeCloseTo(overview.at(-1)!.valueMm, 9);
    const geometry = calculateRafterGeometry(base);
    expect(overview[0]!.valueMm).toBeCloseTo(geometry.eaveLengthMm, 9);
    expect(overview.at(-1)!.valueMm).toBeCloseTo(geometry.slopeLengthMm, 9);
  });

  it("keeps S2 and S3 as explicit states when there is no intermediate or ridge purlin", () => {
    const model = createRafterJointDrawingModel(calculateRafterJoints(base));
    expect(model.slots[1]).toMatchObject({ status: "absent", dimensions: [], focus: null, note: expect.stringContaining("nincs megadva") });
    expect(model.slots[2]).toMatchObject({ name: "Gerinc · szembefutó", status: "computed", dimensions: [], note: expect.stringContaining("Nincs gerincszelemen") });
    expect(model.slots[2].angles[0]!.valueDegrees).toBeCloseTo(90 - 36.869898, 5);
    expect(model.section!.supports.map((support) => support.slot)).toEqual(["S1"]);
    const board = createRafterJointDrawingModel(calculateRafterJoints({ ...base, ridgeJoint: "board", ridgeBoardThicknessMm: 50 }));
    expect(dim(board.slots[2].dimensions, "S3-board").valueMm).toBe(25);
    expect(board.section!.overview.at(-1)!.valueMm).toBe(5500 - 31.25);
  });

  it("draws nothing that the inputs do not prove", () => {
    const missing = createRafterJointDrawingModel(calculateRafterJoints({ ...three, rafterDepthMm: undefined }));
    expect(missing.section).toBeNull();
    expect(missing.slots.map((slot) => slot.status)).toEqual(["incomplete", "incomplete", "incomplete"]);
    expect(missing.slots.every((slot) => slot.dimensions.length === 0 && slot.focus === null)).toBe(true);
    const invalid = createRafterJointDrawingModel(calculateRafterJoints({ ...three, purlinTopMm: 1300 }));
    expect(invalid.section).toBeNull();
    expect(invalid.slots[1]).toMatchObject({ status: "invalid", joint: { reason: expect.stringContaining("alátétezés") } });
    // Unknown support extents are schematic; only the top plane over the seat (or a ridge purlin's given width) is solid.
    const { supports } = createRafterJointDrawingModel(calculateRafterJoints(three)).section!;
    expect(supports.find((item) => item.slot === "S1")!.bearing).toEqual([{ xMm: 0, yMm: 0 }, { xMm: 200, yMm: 0 }]);
    expect(supports.find((item) => item.slot === "S3")!.bearing.map((point) => point.xMm)).toEqual([3920, 4080]);
  });
});

describe("drawing camera", () => {
  const size = { width: 343, height: 260 };
  it("fits bounds inside the padding and zooms around a fixed screen point", () => {
    const camera = fitCamera({ minX: -400, minY: -300, maxX: 4000, maxY: 3000 }, size, 24);
    const a = projectPoint(camera, size, { xMm: -400, yMm: 3000 }), b = projectPoint(camera, size, { xMm: 4000, yMm: -300 });
    expect(Math.min(a.x, a.y)).toBeGreaterThanOrEqual(24 - 1e-9);
    expect(Math.max(b.x - size.width, b.y - size.height)).toBeLessThanOrEqual(-24 + 1e-9);
    const at = { x: 100, y: 80 }, point = { xMm: 1234, yMm: 987 };
    const before = projectPoint(camera, size, point);
    const zoomed = zoomCameraAt(camera, size, 2.5, before, camera.scale / 2, camera.scale * 10);
    expect(projectPoint(zoomed, size, point).x).toBeCloseTo(before.x, 9);
    expect(zoomCameraAt(camera, size, 100, at, 0, camera.scale * 3).scale).toBe(camera.scale * 3);
    const moved = projectPoint(panCamera(camera, 10, -5), size, point);
    expect([moved.x - before.x, moved.y - before.y]).toEqual([expect.closeTo(10, 9), expect.closeTo(-5, 9)]);
  });
});

const near = (a: MmPoint, b: MmPoint) => Math.hypot(a.xMm - b.xMm, a.yMm - b.yMm) < 1e-6;

describe("cutting marks (M9.1)", () => {
  it("draws the offcut from the same points the dimensions measure, and positions every mark from the common origin O", () => {
    const model = createRafterJointDrawingModel(calculateRafterJoints(three));
    const section = model.section!;
    expect(section.origin).toEqual({ xMm: 0, yMm: 100 });
    for (const slot of model.slots) {
      const cut = slot.cut!, [a, b, c] = cut.offcut!;
      const point = (id: string) => cut.points.find((item) => item.id === id)!.at;
      expect([near(a!, point("A")), near(b!, point("B")), near(c!, point("C"))]).toEqual([true, true, true]);
      // The plumb edge is vertical, the seat edge horizontal, and their lengths are the labelled plumb height and seat.
      expect(a!.xMm).toBeCloseTo(b!.xMm, 9);
      expect(c!.yMm).toBeCloseTo(b!.yMm, 9);
      expect(b!.yMm - a!.yMm).toBeCloseTo(dim(slot.dimensions, `${slot.slot}-plumb`).valueMm, 9);
      expect(c!.xMm - b!.xMm).toBeCloseTo(dim(slot.dimensions, `${slot.slot}-seat`).valueMm, 9);
      // Perpendicular depth + remaining = section depth h; horizontal and perpendicular values are different numbers.
      expect(dim(slot.dimensions, `${slot.slot}-depth`).valueMm + dim(slot.dimensions, `${slot.slot}-remaining`).valueMm).toBeCloseTo(section.depthMm, 9);
      expect(dim(slot.dimensions, `${slot.slot}-depth`).valueMm).not.toBeCloseTo(dim(slot.dimensions, `${slot.slot}-plumb`).valueMm, 3);
      // M lies on the upper edge above B; its distance from O along the edge is the slot position.
      const m = point("M");
      expect(Math.hypot(m.xMm - section.origin.xMm, m.yMm - section.origin.yMm)).toBeCloseTo(slot.positionMm!, 6);
    }
    expect(section.stations.map((item) => [item.id, Number(item.positionMm.toFixed(6))])).toEqual([["eave-end", -500], ["S1", 0], ["S2", 2500], ["S3", 4900], ["ridge-end", 5000]]);
    expect(section.endCuts.map((item) => item.id)).toEqual(["eave-end", "ridge-end"]);
  });

  it("keeps opposed and board ridges as end cuts without an invented notch", () => {
    for (const input of [base, { ...base, ridgeJoint: "board" as const, ridgeBoardThicknessMm: 50 }]) {
      const s3 = createRafterJointDrawingModel(calculateRafterJoints(input)).slots[2];
      expect(s3.cut).toMatchObject({ offcut: null, markLine: null, edges: [{ id: "end" }] });
    }
    expect(createRafterJointDrawingModel(calculateRafterJoints({ ...base, ridgeJoint: "board", ridgeBoardThicknessMm: 50 })).slots[2].positionMm).toBeCloseTo((4000 - 25) / .8, 9);
  });

  it("stays consistent for very flat and very steep valid pitches and for a tiny notch", () => {
    // 10°: effective rise 4000·tan10°; 70°: 4000·tan70°; tiny: a derékszelemen only 2 mm above the lower edge.
    const flat = { ...three, riseMm: 100 + 4000 * Math.tan(10 * Math.PI / 180), purlinTopMm: 100 - 200 / Math.cos(10 * Math.PI / 180) + 2000 * Math.tan(10 * Math.PI / 180) + 30, ridgePurlinTopMm: 100 - 200 / Math.cos(10 * Math.PI / 180) + 3920 * Math.tan(10 * Math.PI / 180) + 10 };
    const steep = { ...three, riseMm: 100 + 4000 * Math.tan(70 * Math.PI / 180), purlinTopMm: 100 - 200 / Math.cos(70 * Math.PI / 180) + 2000 * Math.tan(70 * Math.PI / 180) + 150, ridgePurlinTopMm: 100 - 200 / Math.cos(70 * Math.PI / 180) + 3920 * Math.tan(70 * Math.PI / 180) + 100 };
    const tiny = { ...three, purlinTopMm: 1352 };
    for (const [input, pitch] of [[flat, 10], [steep, 70], [tiny, 36.869898]] as const) {
      const joints = calculateRafterJoints(input);
      expect(joints.pitchDegrees).toBeCloseTo(pitch, 5);
      const model = createRafterJointDrawingModel(joints);
      expect(model.section).not.toBeNull();
      for (const item of [...model.slots.flatMap((slot) => slot.dimensions), ...model.section!.overview]) expect(measured(item)).toBeCloseTo(item.valueMm, 6);
      // Plumb cut angle to the rafter axis is 90° − pitch, the seat cut angle equals the pitch only numerically.
      expect(model.slots[0].angles.map((angle) => angle.valueDegrees)).toEqual([expect.closeTo(90 - pitch, 5), expect.closeTo(pitch, 5)]);
    }
    expect(dim(createRafterJointDrawingModel(calculateRafterJoints(tiny)).slots[1].dimensions, "S2-plumb").valueMm).toBeCloseTo(2, 9);
  });

  it("nudges a label off a cut edge without moving the edge", () => {
    const box = { point: { x: 50, y: 50 }, width: 30, height: 14, anchor: "middle" as const };
    const edge = [{ x: 0, y: 50 }, { x: 100, y: 50 }] as const;
    expect(labelHitsSegment(box, edge[0], edge[1])).toBe(true);
    const moved = nudgeOffSegments(box, [edge], { x: 0, y: 1 }, 6);
    expect(labelHitsSegment({ ...box, point: moved }, edge[0], edge[1])).toBe(false);
    expect(moved.x).toBe(50);
  });
});
