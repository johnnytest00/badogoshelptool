import { describe, expect, it } from "vitest";
import { angleScreenGeometry, dimensionScreenGeometry, technicalAnnotationRules } from "./annotation-layout";

describe("technical drawing annotation layout", () => {
  it("keeps dimension offsets in compact screen space", () => {
    const layout = dimensionScreenGeometry("horizontal", { x: 100, y: 200 }, { x: 900, y: 200 }, 900);
    expect(layout.start).toEqual({ x: 100, y: 236 });
    expect(layout.extensionStart).toEqual({ x: 100, y: 208 });
    expect(layout.end).toEqual({ x: 900, y: 236 });
    expect(layout.end.y - layout.start.y).toBe(0);
    expect(layout.start.y - 200).toBe(technicalAnnotationRules.dimensionOffset);
  });

  it("uses the aligned dimension normal instead of a viewport-sized offset", () => {
    const layout = dimensionScreenGeometry("aligned", { x: 100, y: 300 }, { x: 500, y: 100 }, -650);
    expect(Math.hypot(layout.start.x - 100, layout.start.y - 300)).toBeCloseTo(36);
    expect(Math.hypot(layout.end.x - 500, layout.end.y - 100)).toBeCloseTo(36);
    expect(Math.hypot(layout.label.x - (layout.start.x + layout.end.x) / 2, layout.label.y - (layout.start.y + layout.end.y) / 2)).toBeCloseTo(12);
  });

  it("creates a compact arc and label on the angle bisector", () => {
    const layout = angleScreenGeometry({ x: 500, y: 300 }, { x: 420, y: 380 }, { x: 580, y: 300 });
    expect(Math.hypot(layout.start.x - 500, layout.start.y - 300)).toBeCloseTo(technicalAnnotationRules.angleRadius);
    expect(Math.hypot(layout.end.x - 500, layout.end.y - 300)).toBeCloseTo(technicalAnnotationRules.angleRadius);
    expect(Math.hypot(layout.label.x - 500, layout.label.y - 300)).toBeCloseTo(technicalAnnotationRules.angleLabelRadius);
  });
});
