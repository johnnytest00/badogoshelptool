import { describe, expect, it } from "vitest";
import { hasPageArea, pagePointFromViewport, viewportPointFromPage, rectangleForPoints } from "./drawing-roof-section";

describe("drawing roof section coordinates", () => {
  it("keeps a visual selection anchored to the PDF page through zoom and rotation", () => {
    const pagePoint = { x: 0.2, y: 0.3 };
    for (const rotation of [0, 90, 180, 270] as const) {
      const restored = pagePointFromViewport(viewportPointFromPage(pagePoint, rotation), rotation);
      expect(restored.x).toBeCloseTo(pagePoint.x);
      expect(restored.y).toBeCloseTo(pagePoint.y);
    }
  });

  it("creates a page-relative rectangle from two selected corners", () => {
    const rectangle = rectangleForPoints({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 });
    expect(rectangle.x).toBeCloseTo(0.2);
    expect(rectangle.y).toBeCloseTo(0.1);
    expect(rectangle.width).toBeCloseTo(0.6);
    expect(rectangle.height).toBeCloseTo(0.6);
  });

  it("does not accept a zero-area rectangle as a roof section", () => {
    expect(hasPageArea(rectangleForPoints({ x: 0.4, y: 0.4 }, { x: 0.4, y: 0.8 }))).toBe(false);
    expect(hasPageArea(rectangleForPoints({ x: 0.2, y: 0.1 }, { x: 0.8, y: 0.9 }))).toBe(true);
  });
});
