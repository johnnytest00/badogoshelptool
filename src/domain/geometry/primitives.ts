import { calculationError } from "@/domain/calculations/errors";
import {
  Millimeters,
  millimeters,
  SquareMillimeters,
  squareMillimeters,
} from "@/domain/measurements/units";
import { DEFAULT_NUMERIC_TOLERANCE, nearlyEqual } from "@/domain/math/operations";

export type Point2D = Readonly<{ x: Millimeters; y: Millimeters }>;
export type Point3D = Readonly<{ x: Millimeters; y: Millimeters; z: Millimeters }>;
export type Vector2D = Readonly<{ x: Millimeters; y: Millimeters }>;
export type Vector3D = Readonly<{ x: Millimeters; y: Millimeters; z: Millimeters }>;
export type LineSegment2D = Readonly<{ start: Point2D; end: Point2D }>;
export type LineSegment3D = Readonly<{ start: Point3D; end: Point3D }>;
export type Polygon2D = Readonly<{ points: readonly Point2D[] }>;

function coordinate(value: number, label: string): Millimeters {
  if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
    throw calculationError("INVALID_GEOMETRY", `${label} must be a finite safe integer.`);
  }
  return millimeters(value);
}

export function point2D(x: number, y: number): Point2D {
  return Object.freeze({ x: coordinate(x, "x"), y: coordinate(y, "y") });
}

export function point3D(x: number, y: number, z: number): Point3D {
  return Object.freeze({ x: coordinate(x, "x"), y: coordinate(y, "y"), z: coordinate(z, "z") });
}

export function vector2D(x: number, y: number): Vector2D {
  return Object.freeze({ x: coordinate(x, "x"), y: coordinate(y, "y") });
}

export function vector3D(x: number, y: number, z: number): Vector3D {
  return Object.freeze({ x: coordinate(x, "x"), y: coordinate(y, "y"), z: coordinate(z, "z") });
}

export function lineSegment2D(start: Point2D, end: Point2D): LineSegment2D {
  if (pointsCoincident(start, end)) throw calculationError("INVALID_GEOMETRY", "A segment cannot have coincident endpoints.");
  return Object.freeze({ start, end });
}

export function lineSegment3D(start: Point3D, end: Point3D): LineSegment3D {
  if (points3DCoincident(start, end)) throw calculationError("INVALID_GEOMETRY", "A segment cannot have coincident endpoints.");
  return Object.freeze({ start, end });
}

export function polygon2D(points: readonly Point2D[]): Polygon2D {
  if (points.length < 3) throw calculationError("INVALID_GEOMETRY", "A polygon needs at least three points.");
  if (points.some((point, index) => pointsCoincident(point, points[(index + 1) % points.length]))) {
    throw calculationError("INVALID_GEOMETRY", "A polygon cannot contain coincident neighbouring points.");
  }
  const polygon = Object.freeze({ points: [...points] as readonly Point2D[] });
  if (hasSelfIntersection(polygon)) {
    throw calculationError("INVALID_GEOMETRY", "A polygon cannot self-intersect.");
  }
  if (Math.abs(signedArea(polygon)) <= DEFAULT_NUMERIC_TOLERANCE) {
    throw calculationError("INVALID_GEOMETRY", "A polygon cannot have zero area.");
  }
  return polygon;
}

export function pointsCoincident(a: Point2D, b: Point2D): boolean {
  return a.x === b.x && a.y === b.y;
}

export function points3DCoincident(a: Point3D, b: Point3D): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function distance3D(a: Point3D, b: Point3D): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function segmentLength2D(segment: LineSegment2D): number {
  return distance2D(segment.start, segment.end);
}

export function segmentLength3D(segment: LineSegment3D): number {
  return distance3D(segment.start, segment.end);
}

export function vectorMagnitude2D(vector: Vector2D): number {
  return Math.hypot(vector.x, vector.y);
}

export function vectorMagnitude3D(vector: Vector3D): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function normalize2D(vector: Vector2D): Readonly<{ x: number; y: number }> {
  const magnitude = vectorMagnitude2D(vector);
  if (nearlyEqual(magnitude, 0)) throw calculationError("INVALID_GEOMETRY", "A zero vector cannot be normalized.");
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

export function normalize3D(vector: Vector3D): Readonly<{ x: number; y: number; z: number }> {
  const magnitude = vectorMagnitude3D(vector);
  if (nearlyEqual(magnitude, 0)) throw calculationError("INVALID_GEOMETRY", "A zero vector cannot be normalized.");
  return { x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude };
}

export function dot2D(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

export function dot3D(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross2D(a: Vector2D, b: Vector2D): number {
  return a.x * b.y - a.y * b.x;
}

export function cross3D(a: Vector3D, b: Vector3D): Vector3D {
  return vector3D(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

export function midpoint2D(a: Point2D, b: Point2D): Point2D {
  return point2D(Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2));
}

export function midpoint3D(a: Point3D, b: Point3D): Point3D {
  return point3D(Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2), Math.round((a.z + b.z) / 2));
}

export function translate2D(point: Point2D, offset: Vector2D): Point2D {
  return point2D(point.x + offset.x, point.y + offset.y);
}

export function signedArea(polygon: Polygon2D): number {
  return polygon.points.reduce((area, point, index) => {
    const next = polygon.points[(index + 1) % polygon.points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

export function polygonArea(polygon: Polygon2D): SquareMillimeters {
  return squareMillimeters(Math.round(Math.abs(signedArea(polygon))));
}

export function polygonPerimeter(polygon: Polygon2D): number {
  return polygon.points.reduce((total, point, index) => total + distance2D(point, polygon.points[(index + 1) % polygon.points.length]), 0);
}

export function projectPointToSegment(point: Point2D, segment: LineSegment2D): Point2D {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const denominator = dx * dx + dy * dy;
  if (denominator === 0) throw calculationError("INVALID_GEOMETRY", "Cannot project onto a zero-length segment.");
  const t = Math.min(1, Math.max(0, ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / denominator));
  return point2D(Math.round(segment.start.x + t * dx), Math.round(segment.start.y + t * dy));
}

function orientation(a: Point2D, b: Point2D, c: Point2D): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Point2D, b: Point2D, c: Point2D): boolean {
  return Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) && Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y);
}

function edgesIntersect(a: LineSegment2D, b: LineSegment2D): boolean {
  const o1 = orientation(a.start, a.end, b.start);
  const o2 = orientation(a.start, a.end, b.end);
  const o3 = orientation(b.start, b.end, a.start);
  const o4 = orientation(b.start, b.end, a.end);
  if (o1 === 0 && onSegment(a.start, b.start, a.end)) return true;
  if (o2 === 0 && onSegment(a.start, b.end, a.end)) return true;
  if (o3 === 0 && onSegment(b.start, a.start, b.end)) return true;
  if (o4 === 0 && onSegment(b.start, a.end, b.end)) return true;
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function hasSelfIntersection(polygon: Polygon2D): boolean {
  const edges = polygon.points.map((point, index) => ({ start: point, end: polygon.points[(index + 1) % polygon.points.length] }));
  for (let first = 0; first < edges.length; first += 1) {
    for (let second = first + 1; second < edges.length; second += 1) {
      if (second === first + 1 || (first === 0 && second === edges.length - 1)) continue;
      if (edgesIntersect(edges[first], edges[second])) return true;
    }
  }
  return false;
}
