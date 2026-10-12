import { describe, expect, it } from "vitest";
import { clampDrawingZoom, pinchViewport } from "./drawing-viewport";

describe("drawing viewport", () => {
  it("keeps zoom within the approved range", () => {
    expect(clampDrawingZoom(0)).toBe(0.65);
    expect(clampDrawingZoom(1.234)).toBe(1.23);
    expect(clampDrawingZoom(9)).toBe(3);
  });

  it("zooms around the two-pointer focal point", () => {
    const result = pinchViewport({ zoom: 1, pan: { x: 0, y: 0 }, distance: 100, midpoint: { x: 650, y: 280 } }, { distance: 200, midpoint: { x: 650, y: 280 } }, { x: 500, y: 280 });
    expect(result.zoom).toBe(2);
    expect(result.pan).toEqual({ x: -150, y: 0 });
  });
});
