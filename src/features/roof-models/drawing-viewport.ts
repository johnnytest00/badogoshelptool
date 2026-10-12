export type ViewportPan = Readonly<{ x: number; y: number }>;
export type ViewportPoint = Readonly<{ x: number; y: number }>;
export type ViewportBounds = Readonly<{ minX: number; minY: number; maxX: number; maxY: number }>;
export type ViewportRect = Readonly<{ left: number; top: number; width: number; height: number }>;
export type PanGesture = Readonly<{ startPoint: ViewportPoint; startPan: ViewportPan; startZoom: number }>;

export const drawingZoomBounds = { min: 0.65, max: 3 } as const;
export const drawingViewBox = { width: 1000, height: 560 } as const;
export const drawingInitialViewport = { zoom: 1, pan: { x: 0, y: 0 } } as const;

export function clampDrawingZoom(value: number): number {
  return Math.min(drawingZoomBounds.max, Math.max(drawingZoomBounds.min, Number(value.toFixed(2))));
}

/** Maps a client-space point into the actual preserveAspectRatio viewBox. */
export function clientPointToViewBox(point: ViewportPoint, rect: ViewportRect): ViewportPoint {
  const scale = Math.min(rect.width / drawingViewBox.width, rect.height / drawingViewBox.height);
  const renderedWidth = drawingViewBox.width * scale;
  const renderedHeight = drawingViewBox.height * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;
  return { x: (point.x - rect.left - offsetX) / scale, y: (point.y - rect.top - offsetY) / scale };
}

/** Applies a client-space pointer delta without a drag threshold or zoom jump. */
export function panViewport(start: Readonly<{ pan: ViewportPan; point: ViewportPoint }>, currentPoint: ViewportPoint, zoom: number): ViewportPan {
  const safeZoom = Math.max(zoom, 0.01);
  return { x: start.pan.x + (currentPoint.x - start.point.x) / safeZoom, y: start.pan.y + (currentPoint.y - start.point.y) / safeZoom };
}

/** Re-bases a surviving pointer after pinch; no pointer means a cancelled gesture. */
export function rebasePanGesture(remainingPoints: readonly ViewportPoint[], viewport: Readonly<{ pan: ViewportPan; zoom: number }>): PanGesture | null {
  const point = remainingPoints[0];
  return point ? { startPoint: point, startPan: viewport.pan, startZoom: viewport.zoom } : null;
}

export function pinchViewport(start: Readonly<{ zoom: number; pan: ViewportPan; distance: number; midpoint: ViewportPoint }>, current: Readonly<{ distance: number; midpoint: ViewportPoint }>, center: ViewportPoint): Readonly<{ zoom: number; pan: ViewportPan }> {
  const ratio = current.distance / Math.max(start.distance, 1);
  const zoom = clampDrawingZoom(start.zoom * ratio);
  const appliedRatio = zoom / start.zoom;
  const focalShift = { x: (start.midpoint.x - center.x) * (1 - appliedRatio), y: (start.midpoint.y - center.y) * (1 - appliedRatio) };
  return { zoom, pan: { x: start.pan.x + focalShift.x + current.midpoint.x - start.midpoint.x, y: start.pan.y + focalShift.y + current.midpoint.y - start.midpoint.y } };
}

export function fitDrawingViewport(bounds: ViewportBounds, viewport: Readonly<{ width: number; height: number }>, padding = 32): Readonly<{ zoom: number; pan: ViewportPan }> {
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const ratio = viewport.width / Math.max(viewport.height, 1);
  const viewBoxRatio = drawingViewBox.width / drawingViewBox.height;
  const visibleWidth = ratio < viewBoxRatio ? drawingViewBox.height * ratio : drawingViewBox.width;
  const visibleHeight = ratio < viewBoxRatio ? drawingViewBox.height : drawingViewBox.width / Math.max(ratio, 0.01);
  const availableWidth = Math.max(visibleWidth - padding * 2, 1);
  const availableHeight = Math.max(visibleHeight - padding * 2, 1);
  const zoom = clampDrawingZoom(Math.min(availableWidth / width, availableHeight / height));
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  return { zoom, pan: { x: drawingViewBox.width / 2 - center.x, y: drawingViewBox.height / 2 - center.y } };
}
