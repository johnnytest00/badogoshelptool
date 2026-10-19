export type ViewportPan = Readonly<{ x: number; y: number }>;
export type ViewportPoint = Readonly<{ x: number; y: number }>;
export type ViewportBounds = Readonly<{ minX: number; minY: number; maxX: number; maxY: number }>;
export type ViewportRect = Readonly<{ left: number; top: number; width: number; height: number }>;
export type PanGesture = Readonly<{ startPoint: ViewportPoint; startPan: ViewportPan; startZoom: number }>;

export const drawingZoomBounds = { min: 0.4, max: 3 } as const;
export const drawingViewBox = { width: 1000, height: 560 } as const;
export const drawingInitialViewport = { zoom: 1, pan: { x: 0, y: 0 } } as const;

export function clampDrawingZoom(value: number): number {
  if (!Number.isFinite(value)) return drawingInitialViewport.zoom;
  return Math.min(drawingZoomBounds.max, Math.max(drawingZoomBounds.min, Number(value.toFixed(2))));
}

/** Maps a client-space point into the actual preserveAspectRatio viewBox. */
export function clientPointToViewBox(point: ViewportPoint, rect: ViewportRect): ViewportPoint | null {
  if (![point.x, point.y, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return null;
  const scale = Math.min(rect.width / drawingViewBox.width, rect.height / drawingViewBox.height);
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const renderedWidth = drawingViewBox.width * scale;
  const renderedHeight = drawingViewBox.height * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;
  const mapped = { x: (point.x - rect.left - offsetX) / scale, y: (point.y - rect.top - offsetY) / scale };
  return Number.isFinite(mapped.x) && Number.isFinite(mapped.y) ? mapped : null;
}

/** Applies a client-space pointer delta without a drag threshold or zoom jump. */
export function panViewport(start: Readonly<{ pan: ViewportPan; point: ViewportPoint }>, currentPoint: ViewportPoint, zoom: number): ViewportPan {
  const fallback = { x: Number.isFinite(start.pan.x) ? start.pan.x : 0, y: Number.isFinite(start.pan.y) ? start.pan.y : 0 };
  if (![start.point.x, start.point.y, currentPoint.x, currentPoint.y, zoom].every(Number.isFinite)) return fallback;
  const safeZoom = Math.max(zoom, 0.01);
  const next = { x: fallback.x + (currentPoint.x - start.point.x) / safeZoom, y: fallback.y + (currentPoint.y - start.point.y) / safeZoom };
  return Number.isFinite(next.x) && Number.isFinite(next.y) ? next : fallback;
}

/** Re-bases a surviving pointer after pinch; no pointer means a cancelled gesture. */
export function rebasePanGesture(remainingPoints: readonly ViewportPoint[], viewport: Readonly<{ pan: ViewportPan; zoom: number }>): PanGesture | null {
  const point = remainingPoints[0];
  if (!point || ![point.x, point.y, viewport.pan.x, viewport.pan.y, viewport.zoom].every(Number.isFinite)) return null;
  return { startPoint: point, startPan: viewport.pan, startZoom: clampDrawingZoom(viewport.zoom) };
}

export function pinchViewport(start: Readonly<{ zoom: number; pan: ViewportPan; distance: number; midpoint: ViewportPoint }>, current: Readonly<{ distance: number; midpoint: ViewportPoint }>, center: ViewportPoint): Readonly<{ zoom: number; pan: ViewportPan }> {
  const safeStartZoom = clampDrawingZoom(start.zoom);
  const safeStartPan = { x: Number.isFinite(start.pan.x) ? start.pan.x : 0, y: Number.isFinite(start.pan.y) ? start.pan.y : 0 };
  if (![start.distance, start.midpoint.x, start.midpoint.y, current.distance, current.midpoint.x, current.midpoint.y, center.x, center.y].every(Number.isFinite) || start.distance <= 0 || current.distance <= 0) {
    return { zoom: safeStartZoom, pan: safeStartPan };
  }
  const ratio = current.distance / start.distance;
  const zoom = clampDrawingZoom(safeStartZoom * ratio);
  const appliedRatio = zoom / safeStartZoom;
  const focalShift = { x: (start.midpoint.x - center.x) * (1 - appliedRatio), y: (start.midpoint.y - center.y) * (1 - appliedRatio) };
  const pan = { x: safeStartPan.x + focalShift.x + current.midpoint.x - start.midpoint.x, y: safeStartPan.y + focalShift.y + current.midpoint.y - start.midpoint.y };
  return Number.isFinite(pan.x) && Number.isFinite(pan.y) ? { zoom, pan } : { zoom: safeStartZoom, pan: safeStartPan };
}

export function fitDrawingViewport(bounds: ViewportBounds, viewport: Readonly<{ width: number; height: number }>, padding = 32): Readonly<{ zoom: number; pan: ViewportPan }> {
  if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, viewport.width, viewport.height, padding].every(Number.isFinite) || bounds.maxX < bounds.minX || bounds.maxY < bounds.minY || viewport.width <= 0 || viewport.height <= 0) return drawingInitialViewport;
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const ratio = viewport.width / Math.max(viewport.height, 1);
  const viewBoxRatio = drawingViewBox.width / drawingViewBox.height;
  // preserveAspectRatio "meet": the whole viewBox is always visible, and the element shows extra viewBox-space along its longer axis.
  const visibleWidth = ratio < viewBoxRatio ? drawingViewBox.width : drawingViewBox.height * ratio;
  const visibleHeight = ratio < viewBoxRatio ? drawingViewBox.width / Math.max(ratio, 0.01) : drawingViewBox.height;
  const safePadding = Math.max(padding, 0);
  const availableWidth = Math.max(visibleWidth - safePadding * 2, 1);
  const availableHeight = Math.max(visibleHeight - safePadding * 2, 1);
  const zoom = clampDrawingZoom(Math.min(availableWidth / width, availableHeight / height));
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  // The drawing transform is translate(pan) · scale(zoom) around the viewBox centre, so the centring shift is applied in scaled units.
  const pan = { x: (drawingViewBox.width / 2 - center.x) * zoom, y: (drawingViewBox.height / 2 - center.y) * zoom };
  return Number.isFinite(zoom) && Number.isFinite(pan.x) && Number.isFinite(pan.y) ? { zoom, pan } : drawingInitialViewport;
}
