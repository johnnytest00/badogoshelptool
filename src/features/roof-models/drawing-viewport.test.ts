import { describe, expect, it } from "vitest";
import { clampDrawingZoom, clientPointToViewBox, drawingViewBox, fitDrawingViewport, panViewport, pinchViewport, rebasePanGesture } from "./drawing-viewport";

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

  it("fits a narrow viewport without distorting the drawing", () => {
    const result = fitDrawingViewport({ minX: 80, minY: 80, maxX: 920, maxY: 480 }, { width: 320, height: 700 });
    expect(result.zoom).toBeLessThan(1);
    expect(result.pan).toEqual({ x: 0, y: 0 });
  });

  it("keeps fit and reset as different documented viewport states", () => {
    const fit = fitDrawingViewport({ minX: 200, minY: 120, maxX: 700, maxY: 420 }, { width: 1440, height: 900 });
    expect(fit.pan).toEqual({ x: 50, y: 10 });
    expect(fit.zoom).toBeGreaterThan(1);
  });

  it("starts panning on the first pointer delta and preserves 1:1 screen movement", () => {
    const nextPan = panViewport({ pan: { x: 20, y: -10 }, point: { x: 300, y: 240 } }, { x: 316, y: 228 }, 2);
    expect(nextPan).toEqual({ x: 28, y: -16 });
  });

  it("maps letterboxed SVG coordinates without an initial jump", () => {
    const rect = { left: 10, top: 20, width: 320, height: 700 };
    const center = clientPointToViewBox({ x: 170, y: 370 }, rect);
    expect(center.x).toBeCloseTo(drawingViewBox.width / 2);
    expect(center.y).toBeCloseTo(drawingViewBox.height / 2);
  });

  it("rebases one-finger pan after pinch and clears the gesture on cancel", () => {
    const pinchResult = pinchViewport({ zoom: 1, pan: { x: 0, y: 0 }, distance: 100, midpoint: { x: 500, y: 280 } }, { distance: 150, midpoint: { x: 500, y: 280 } }, { x: 500, y: 280 });
    const rebased = panViewport({ pan: pinchResult.pan, point: { x: 420, y: 280 } }, { x: 430, y: 280 }, pinchResult.zoom);
    expect(rebased.x).toBeCloseTo(6.67, 1);
    expect(rebased.y).toBe(0);
    expect(rebasePanGesture([{ x: 430, y: 280 }], { pan: pinchResult.pan, zoom: pinchResult.zoom })).toEqual({ startPoint: { x: 430, y: 280 }, startPan: pinchResult.pan, startZoom: pinchResult.zoom });
    expect(rebasePanGesture([], { pan: pinchResult.pan, zoom: pinchResult.zoom })).toBeNull();
  });
});
