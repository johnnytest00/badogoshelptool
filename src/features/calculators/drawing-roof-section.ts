export type PagePoint = Readonly<{ x: number; y: number }>;
export type PageRectangle = Readonly<{ x: number; y: number; width: number; height: number }>;
export type PageRotation = 0 | 90 | 180 | 270;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function pagePointFromViewport(point: PagePoint, rotation: PageRotation): PagePoint {
  switch (rotation) {
    case 90: return { x: clamp(point.y), y: clamp(1 - point.x) };
    case 180: return { x: clamp(1 - point.x), y: clamp(1 - point.y) };
    case 270: return { x: clamp(1 - point.y), y: clamp(point.x) };
    default: return { x: clamp(point.x), y: clamp(point.y) };
  }
}

export function viewportPointFromPage(point: PagePoint, rotation: PageRotation): PagePoint {
  switch (rotation) {
    case 90: return { x: clamp(1 - point.y), y: clamp(point.x) };
    case 180: return { x: clamp(1 - point.x), y: clamp(1 - point.y) };
    case 270: return { x: clamp(point.y), y: clamp(1 - point.x) };
    default: return { x: clamp(point.x), y: clamp(point.y) };
  }
}

export function rectangleForPoints(first: PagePoint, second: PagePoint): PageRectangle {
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  return { x, y, width: Math.max(first.x, second.x) - x, height: Math.max(first.y, second.y) - y };
}

export function hasPageArea(rectangle: PageRectangle): boolean {
  return rectangle.width > 0 && rectangle.height > 0;
}
