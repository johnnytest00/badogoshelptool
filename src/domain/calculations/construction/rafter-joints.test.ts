import { describe, expect, it } from "vitest";
import { calculateRafterJoints, rafterJointInputFromFields, type RafterJointInput } from "./rafter-joints";

// Independent hand trigonometry (3-4-5 triangle): halfSpan 4000, rise 3100, HAP 100 → effective rise 3000,
// tanα = 0.75, cosα = 0.8, α = 36.8699°. Rafter depth h = 200 → plumb depth H = h / cosα = 250.
const base: RafterJointInput = { horizontalHalfSpanMm: 4000, riseMm: 3100, eaveProjectionMm: 400, seatCutHeightMm: 100, rafterDepthMm: 200, ridgeJoint: "opposed" };
const value = (result: ReturnType<typeof calculateRafterJoints>, id: string, label: string) =>
  result.joints.find((joint) => joint.id === id)?.values.find((item) => item.label.startsWith(label))?.value;

describe("rafter joints (upper edge reference, seat cut lowers the effective rise)", () => {
  it("derives the birdsmouth from the rafter depth and the existing seat cut height", () => {
    const result = calculateRafterJoints(base);
    expect(result.pitchDegrees).toBeCloseTo(36.869898, 5);
    // d = H − HAP = 150; seat s = d / tanα = 200; perpendicular depth d·cosα = 120; remaining h − 120 = 80 = HAP·cosα.
    expect(value(result, "seat", "Függővágás magassága")).toBeCloseTo(150, 9);
    expect(value(result, "seat", "Vízszintes ülékhossz")).toBeCloseTo(200, 9);
    expect(value(result, "seat", "Bevágás mélysége")).toBeCloseTo(120, 9);
    expect(value(result, "seat", "Megmaradó")).toBeCloseTo(80, 9);
    expect(result.joints.find((joint) => joint.id === "seat")?.values.filter((item) => item.classification === "A")).toHaveLength(2);
  });

  it("notches or shims an intermediate purlin from its face position and top height", () => {
    // Lower edge at x = 2000: 100 − 250 + 1500 = 1350. Top 1400 → d = 50, s = 66.667, depth 40; along the edge 2000 / 0.8 = 2500.
    const notched = calculateRafterJoints({ ...base, purlinFaceMm: 2000, purlinTopMm: 1400 });
    expect(value(notched, "purlin", "Felfekvés távolsága")).toBeCloseTo(2500, 9);
    expect(value(notched, "purlin", "Függővágás magassága")).toBeCloseTo(50, 9);
    expect(value(notched, "purlin", "Vízszintes ülékhossz")).toBeCloseTo(200 / 3, 9);
    expect(value(notched, "purlin", "Bevágás mélysége")).toBeCloseTo(40, 9);
    const shimmed = calculateRafterJoints({ ...base, purlinFaceMm: 2000, purlinTopMm: 1300 });
    expect(shimmed.joints.find((joint) => joint.id === "purlin")).toMatchObject({ status: "invalid", reason: expect.stringContaining("alátétezés") });
    expect(value(shimmed, "purlin", "Hézag")).toBeCloseTo(50, 9);
  });

  it("shortens the rafter by (t/2)/cosα at a ridge board and notches over a ridge purlin", () => {
    const board = calculateRafterJoints({ ...base, ridgeJoint: "board", ridgeBoardThicknessMm: 50 });
    expect(value(board, "ridge", "Hosszcsökkenés")).toBeCloseTo(31.25, 9);
    expect(value(board, "ridge", "Szarufa teljes hossza")).toBeCloseTo(5500 - 31.25, 9);
    // Face at 4000 − 80 = 3920; lower edge there −150 + 2940 = 2790; top 2850 → d = 60, s = 80, ending exactly at the ridge axis.
    const purlin = calculateRafterJoints({ ...base, ridgeJoint: "purlin", ridgePurlinWidthMm: 160, ridgePurlinTopMm: 2850 });
    expect(value(purlin, "ridge", "Függővágás magassága")).toBeCloseTo(60, 9);
    expect(value(purlin, "ridge", "Vízszintes ülékhossz")).toBeCloseTo(80, 9);
    expect(calculateRafterJoints({ ...base, ridgeJoint: "purlin", ridgePurlinWidthMm: 160, ridgePurlinTopMm: 2870 }).joints.at(-1)).toMatchObject({ status: "invalid", reason: expect.stringContaining("gerinctengely") });
  });

  it("lists missing inputs as C and never claims structural approval", () => {
    const result = calculateRafterJoints({ ...base, rafterDepthMm: undefined, ridgeJoint: "purlin", purlinTopMm: 1400 });
    expect(result.drawing).toBeNull();
    expect(result.joints.map((joint) => joint.status)).toEqual(["incomplete", "incomplete", "incomplete"]);
    expect(result.joints[1].missing).toContain("Derékszelemen ereszoldali síkjának vízszintes helye");
    expect(result.joints.every((joint) => joint.professional.length > 0)).toBe(true);
    expect(calculateRafterJoints({ ...base, seatCutHeightMm: 0 }).joints[0]).toMatchObject({ status: "invalid" });
    expect(calculateRafterJoints({ ...base, seatCutHeightMm: 260 }).joints[0]).toMatchObject({ status: "invalid", reason: expect.stringContaining("alátétezés") });
  });

  it("draws the notched outline from the same geometry", () => {
    const { drawing } = calculateRafterJoints({ ...base, purlinFaceMm: 2000, purlinTopMm: 1400 });
    expect(drawing?.outline[0]).toEqual({ xMm: -400, yMm: -200 });
    expect(drawing?.outline).toContainEqual({ xMm: 0, yMm: 0 });
    expect(drawing?.outline.some((point) => Math.abs(point.xMm - 200) < 1e-9 && Math.abs(point.yMm) < 1e-9)).toBe(true);
    expect(drawing?.supports.map((support) => support.id)).toEqual(["seat", "purlin"]);
  });

  it("reads suite field strings and falls back to an opposed ridge", () => {
    expect(rafterJointInputFromFields({ horizontalHalfSpanMm: 4000, riseMm: 3100, eaveProjectionMm: 0, seatCutHeightMm: undefined, rafterDepthMm: "", ridgeJoint: "x" }))
      .toMatchObject({ seatCutHeightMm: 0, rafterDepthMm: undefined, ridgeJoint: "opposed" });
  });
});
