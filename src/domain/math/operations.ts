import { calculationError } from "@/domain/calculations/errors";
import {
  degrees,
  degreesToRadians,
  Millimeters,
  radians,
  Radians,
  squareMillimeters,
  SquareMillimeters,
} from "@/domain/measurements/units";

export const DEFAULT_NUMERIC_TOLERANCE = 1e-9;

export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(decimals) || decimals < 0) {
    throw calculationError("INVALID_DIMENSION", "Rounding arguments are invalid.");
  }
  const factor = 10 ** decimals;
  const result = Math.round((value + Number.EPSILON) * factor) / factor;
  if (!Number.isFinite(result)) {
    throw calculationError("NUMERIC_OVERFLOW", "Rounding produced a non-finite result.");
  }
  return result;
}

export function nearlyEqual(a: number, b: number, tolerance = DEFAULT_NUMERIC_TOLERANCE): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(tolerance) || tolerance < 0) {
    return false;
  }
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

export function safeMultiply(a: number, b: number): number {
  const result = a * b;
  if (!Number.isFinite(result) || Math.abs(result) > Number.MAX_SAFE_INTEGER) {
    throw calculationError("NUMERIC_OVERFLOW", "Multiplication exceeded safe numeric bounds.");
  }
  return result;
}

export function rightTriangleHypotenuse(a: Millimeters, b: Millimeters): Millimeters {
  if (a < 0 || b < 0) throw calculationError("INVALID_DIMENSION", "Triangle legs cannot be negative.");
  return Math.round(Math.hypot(a, b)) as Millimeters;
}

export function rightTriangleLeg(hypotenuse: Millimeters, otherLeg: Millimeters): Millimeters {
  if (hypotenuse < 0 || otherLeg < 0 || otherLeg > hypotenuse) {
    throw calculationError("INVALID_DIMENSION", "Right-triangle dimensions are invalid.");
  }
  return Math.round(Math.sqrt(hypotenuse ** 2 - otherLeg ** 2)) as Millimeters;
}

export function rectangleArea(width: Millimeters, height: Millimeters): SquareMillimeters {
  if (width < 0 || height < 0) throw calculationError("INVALID_DIMENSION", "Rectangle dimensions cannot be negative.");
  return squareMillimeters(safeMultiply(width, height));
}

export function triangleArea(base: Millimeters, height: Millimeters): SquareMillimeters {
  if (base < 0 || height < 0) throw calculationError("INVALID_DIMENSION", "Triangle dimensions cannot be negative.");
  return squareMillimeters(Math.round(safeMultiply(base, height) / 2));
}

export function angleBetweenRadians(dot: number, magnitudeProduct: number): Radians {
  if (magnitudeProduct <= 0 || !Number.isFinite(dot) || !Number.isFinite(magnitudeProduct)) {
    throw calculationError("INVALID_GEOMETRY", "Angle requires two non-zero finite vectors.");
  }
  return radians(Math.acos(Math.min(1, Math.max(-1, dot / magnitudeProduct))));
}

export { degrees, degreesToRadians, radians };
