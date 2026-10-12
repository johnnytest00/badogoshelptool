export type ViewportPan = Readonly<{ x: number; y: number }>;
export type ViewportPoint = Readonly<{ x: number; y: number }>;

export const drawingZoomBounds = { min: 0.65, max: 3 } as const;

export function clampDrawingZoom(value: number): number {
  return Math.min(drawingZoomBounds.max, Math.max(drawingZoomBounds.min, Number(value.toFixed(2))));
}

export function pinchViewport(start: Readonly<{ zoom: number; pan: ViewportPan; distance: number; midpoint: ViewportPoint }>, current: Readonly<{ distance: number; midpoint: ViewportPoint }>, center: ViewportPoint): Readonly<{ zoom: number; pan: ViewportPan }> {
  const ratio = current.distance / Math.max(start.distance, 1);
  const zoom = clampDrawingZoom(start.zoom * ratio);
  const appliedRatio = zoom / start.zoom;
  const focalShift = { x: (start.midpoint.x - center.x) * (1 - appliedRatio), y: (start.midpoint.y - center.y) * (1 - appliedRatio) };
  return { zoom, pan: { x: start.pan.x + focalShift.x + current.midpoint.x - start.midpoint.x, y: start.pan.y + focalShift.y + current.midpoint.y - start.midpoint.y } };
}
