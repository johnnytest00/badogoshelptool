import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, type RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { createRafterDetailModel, projectAxonometric } from "./rafter-detail";

// Independent hand values: 6 m wide gable, 4 m rise → half span 3 m, 3-4-5 triangle, rafter 5000 mm, pitch atan(4/3).
const GABLE: RoofGeometryInput = { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } };
const HIP: RoofGeometryInput = { type: "hip", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 45 };

function layoutFor(input: RoofGeometryInput, maxSpacingMm: number, section = true) {
  const geometry = calculateRoofGeometry(input);
  const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm, startInsetMm: 0, endInsetMm: 0, ...(section ? { sectionWidthMm: 80, sectionHeightMm: 200 } : {}) } });
  if (layout.status !== "available") throw new Error(layout.reason);
  return { geometry, layout: layout as RoofTimberLayout };
}

describe("rafter detail drawing model", () => {
  it("shows three adjacent rafters taken unchanged from the timber layout", () => {
    const { geometry, layout } = layoutFor(GABLE, 600);
    const model = createRafterDetailModel(geometry, layout, { widthMm: 80, heightMm: 200 })!;
    expect(model.rafters).toHaveLength(3);
    for (const rafter of model.rafters) {
      const source = layout.rafters!.segments.find((segment) => segment.id === rafter.id)!;
      expect(rafter.start).toEqual(source.start);
      expect(rafter.end).toEqual(source.end);
      expect(rafter.lengthMm).toBe(source.lengthMm);
      expect(rafter.lengthMm).toBeCloseTo(5_000, 6);
    }
    expect(model.rafters.filter((rafter) => rafter.highlighted)).toHaveLength(1);
    expect(model.pitchDegrees).toBeCloseTo(Math.atan2(4, 3) * 180 / Math.PI, 6);
  });

  it("labels spacing with the layout's actual spacing, equal to the canonical distance between neighbours", () => {
    const { geometry, layout } = layoutFor(GABLE, 600);
    const model = createRafterDetailModel(geometry, layout, null)!;
    const plane = layout.rafters!.planeLayouts.find((item) => item.planeId === model.planeId)!;
    // 10 000 mm / ceil(10 000 / 600) = 10 000 / 17.
    expect(model.actualSpacingMm).toBe(plane.actualSpacingMm);
    expect(model.actualSpacingMm).toBeCloseTo(10_000 / 17, 6);
    const [a, b] = model.rafters;
    expect(Math.hypot(b.start.xMm - a.start.xMm, b.start.yMm - a.start.yMm)).toBeCloseTo(model.actualSpacingMm, 6);
    expect(model.dimensions.find((item) => item.kind === "spacing")!.valueMm).toBe(plane.actualSpacingMm);
    expect(model.dimensions.find((item) => item.kind === "length")!.valueMm).toBe(model.rafters.find((rafter) => rafter.highlighted)!.lengthMm);
  });

  it("maps every drawn point through one orthographic projection of its canonical 3D point", () => {
    const { geometry, layout } = layoutFor(GABLE, 600);
    const model = createRafterDetailModel(geometry, layout, null)!;
    for (const rafter of model.rafters) {
      expect(rafter.screenStart).toEqual(model.toScreen(rafter.start));
      expect(rafter.screenEnd).toEqual(model.toScreen(rafter.end));
    }
    for (const joint of model.joints) expect(joint.screen).toEqual(model.toScreen(joint.point));
    const p = { xMm: 1_000, yMm: 2_000, zMm: 500 }, q = { xMm: 3_000, yMm: -1_000, zMm: 2_500 };
    const mid = projectAxonometric({ xMm: 2_000, yMm: 500, zMm: 1_500 }, model.frame);
    const pp = projectAxonometric(p, model.frame), qq = projectAxonometric(q, model.frame);
    expect(mid.x).toBeCloseTo((pp.x + qq.x) / 2, 9);
    expect(mid.y).toBeCloseTo((pp.y + qq.y) / 2, 9);
  });

  it("shows only the available rafters when the plane has fewer than three", () => {
    const { geometry, layout } = layoutFor(GABLE, 10_000);
    const model = createRafterDetailModel(geometry, layout, null)!;
    expect(model.rafters).toHaveLength(2);
  });

  it("marks eave and ridge joints as missing data, never as computed notches", () => {
    const { geometry, layout } = layoutFor(GABLE, 600, false);
    const model = createRafterDetailModel(geometry, layout, null)!;
    expect(model.joints.map((joint) => [joint.position, joint.edgeKind, joint.status])).toEqual([["lower", "eave", "missing-data"], ["upper", "ridge", "missing-data"]]);
    expect(model.joints[0].missing).toContain("Szarufa magassága (keresztmetszet)");
    expect(model.joints[0].missing).toContain("HAP · szarufa felső élének magassága a talpszelemen felett");
    expect(model.joints[1].missing.join(" ")).toContain("Gerinccsatlakozás típusa");
    expect(model).not.toHaveProperty("notches");
    const withSection = createRafterDetailModel(geometry, layout, { widthMm: 80, heightMm: 200 })!;
    expect(withSection.joints[0].missing).not.toContain("Szarufa magassága (keresztmetszet)");
  });

  it("declares the 2D section model not applicable at a hip end", () => {
    // The long hip plane is chosen; its middle (common) rafters run eave → ridge.
    const { geometry, layout } = layoutFor(HIP, 600);
    const model = createRafterDetailModel(geometry, layout, null)!;
    expect(model.joints.map((joint) => joint.edgeKind)).toEqual(["eave", "ridge"]);
    // A pyramid's middle rafter ends in the apex, which lies only on hip edges.
    const pyramid = layoutFor({ type: "pyramid", sideMm: 6_000, pitchDegrees: 45 }, 600);
    const pyramidModel = createRafterDetailModel(pyramid.geometry, pyramid.layout, null)!;
    const upper = pyramidModel.joints.find((joint) => joint.position === "upper")!;
    expect(upper.edgeKind).toBe("hip");
    expect(upper.status).toBe("not-applicable");
  });

  it("returns null without rafters", () => {
    const geometry = calculateRoofGeometry(GABLE);
    const layout = calculateRoofTimberLayout(geometry, { batten: { maxSpacingMm: 300, startInsetMm: 0, endInsetMm: 0 } }) as RoofTimberLayout;
    expect(createRafterDetailModel(geometry, layout, null)).toBeNull();
  });
});
