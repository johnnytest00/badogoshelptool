import type { RoofPoint } from "@/domain/calculations/roof-geometry";

/**
 * Shared plane-local geometry for strip layouts. A roof plane is flattened into its own
 * (u, v) frame — u runs along the eave, v up the slope — so that covering columns and
 * underlay courses are the same problem on perpendicular axes.
 */
export const PLANE_EPSILON_MM = 1e-7;
export type Point2 = Readonly<{ u: number; v: number }>;
export type PlaneFrame = Readonly<{ origin: RoofPoint; eaveAxis: readonly [number, number, number]; slopeAxis: readonly [number, number, number] }>;

export function dot(a: readonly number[], b: readonly number[]) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function subtract(a: RoofPoint, b: RoofPoint): [number, number, number] { return [a.xMm - b.xMm, a.yMm - b.yMm, a.zMm - b.zMm]; }
export function cross2(a: Point2, b: Point2, c: Point2) { return (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u); }
export function signedArea(points: readonly Point2[]) { return points.reduce((area, point, index) => { const next = points[(index + 1) % points.length]; return area + point.u * next.v - next.u * point.v; }, 0) / 2; }
export function frameForPlane(points: readonly RoofPoint[]): PlaneFrame | null {
  if (points.length < 3) return null;
  const origin = points[0];
  let gradient: readonly [number, number] | null = null;
  for (let first = 1; first < points.length && !gradient; first++) for (let second = first + 1; second < points.length && !gradient; second++) {
    const a = subtract(points[first], origin), b = subtract(points[second], origin);
    const determinant = a[0] * b[1] - b[0] * a[1];
    if (Math.abs(determinant) <= PLANE_EPSILON_MM) continue;
    const dzA = a[2], dzB = b[2];
    gradient = [(dzA * b[1] - dzB * a[1]) / determinant, (a[0] * dzB - b[0] * dzA) / determinant];
  }
  if (!gradient) return null;
  const magnitude = Math.hypot(...gradient);
  if (!Number.isFinite(magnitude) || magnitude <= PLANE_EPSILON_MM) return null;
  const [a, b] = gradient;
  const eaveAxis: [number, number, number] = [-b / magnitude, a / magnitude, 0];
  const denominator = magnitude * Math.sqrt(1 + magnitude * magnitude);
  const slopeAxis: [number, number, number] = [a / denominator, b / denominator, magnitude / Math.sqrt(1 + magnitude * magnitude)];
  return { origin, eaveAxis, slopeAxis };
}

export function toPlane(point: RoofPoint, frame: PlaneFrame): Point2 {
  const relative = subtract(point, frame.origin);
  return { u: dot(relative, frame.eaveAxis), v: dot(relative, frame.slopeAxis) };
}

export function fromPlane(point: Point2, frame: PlaneFrame): RoofPoint {
  return {
    xMm: frame.origin.xMm + point.u * frame.eaveAxis[0] + point.v * frame.slopeAxis[0],
    yMm: frame.origin.yMm + point.u * frame.eaveAxis[1] + point.v * frame.slopeAxis[1],
    zMm: frame.origin.zMm + point.u * frame.eaveAxis[2] + point.v * frame.slopeAxis[2],
  };
}

export function isConvex(points: readonly Point2[]) {
  let sign = 0;
  for (let index = 0; index < points.length; index++) {
    const turn = cross2(points[index], points[(index + 1) % points.length], points[(index + 2) % points.length]);
    if (Math.abs(turn) <= PLANE_EPSILON_MM) continue;
    const nextSign = Math.sign(turn);
    if (sign && nextSign !== sign) return false;
    sign = nextSign;
  }
  return sign !== 0;
}

export function clip(points: readonly Point2[], axis: "u" | "v", boundary: number, keepGreater: boolean): Point2[] {
  const output: Point2[] = [];
  for (let index = 0; index < points.length; index++) {
    const start = points[index], end = points[(index + 1) % points.length];
    const startDistance = start[axis] - boundary, endDistance = end[axis] - boundary;
    const startInside = keepGreater ? startDistance >= -PLANE_EPSILON_MM : startDistance <= PLANE_EPSILON_MM;
    const endInside = keepGreater ? endDistance >= -PLANE_EPSILON_MM : endDistance <= PLANE_EPSILON_MM;
    if (startInside) output.push(start);
    if (startInside !== endInside) {
      const ratio = startDistance / (startDistance - endDistance);
      output.push({ u: start.u + ratio * (end.u - start.u), v: start.v + ratio * (end.v - start.v) });
    }
  }
  return output.filter((point, index) => !output.slice(0, index).some((other) => Math.hypot(point.u - other.u, point.v - other.v) <= PLANE_EPSILON_MM));
}

export function clippedBand(points: readonly Point2[], axis: "u" | "v", start: number, end: number) {
  const lower = clip(points, axis, start, true);
  return lower.length < 3 ? [] : clip(lower, axis, end, false);
}

export function range(points: readonly Point2[], axis: "u" | "v"): readonly [number, number] {
  return [Math.min(...points.map((point) => point[axis])), Math.max(...points.map((point) => point[axis]))];
}

