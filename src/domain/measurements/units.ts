/**
 * Domain unit conventions: lengths are canonical millimetres, areas mm² and
 * volumes mm³. Values are finite and must stay inside the safe integer range
 * when represented as an integer canonical value.
 */
export type Millimeters = number & { readonly __unit: "mm" };
export type Centimeters = number & { readonly __unit: "cm" };
export type Meters = number & { readonly __unit: "m" };
export type SquareMillimeters = number & { readonly __unit: "mm2" };
export type SquareMeters = number & { readonly __unit: "m2" };
export type CubicMillimeters = number & { readonly __unit: "mm3" };
export type CubicMeters = number & { readonly __unit: "m3" };
export type Degrees = number & { readonly __unit: "degree" };
export type Radians = number & { readonly __unit: "radian" };

export const MAX_SAFE_CANONICAL_VALUE = Number.MAX_SAFE_INTEGER;
export const MIN_SAFE_CANONICAL_VALUE = -Number.MAX_SAFE_INTEGER;

export class UnitValidationError extends Error {
  readonly code = "INVALID_DIMENSION" as const;

  constructor(message: string) {
    super(message);
    this.name = "UnitValidationError";
  }
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new UnitValidationError(`${label} must be finite.`);
  }
  return value;
}

function safeInteger(value: number, label: string): number {
  finite(value, label);
  if (!Number.isSafeInteger(value)) {
    throw new UnitValidationError(`${label} must be a safe integer.`);
  }
  return value;
}

function nonNegative(value: number, label: string): number {
  finite(value, label);
  if (value < 0) {
    throw new UnitValidationError(`${label} cannot be negative.`);
  }
  return value;
}

export function millimeters(value: number): Millimeters {
  return safeInteger(value, "Millimetres") as Millimeters;
}

export function centimeters(value: number): Centimeters {
  return finite(value, "Centimetres") as Centimeters;
}

export function meters(value: number): Meters {
  return finite(value, "Metres") as Meters;
}

export function squareMillimeters(value: number): SquareMillimeters {
  return safeInteger(value, "Square millimetres") as SquareMillimeters;
}

export function squareMeters(value: number): SquareMeters {
  return finite(value, "Square metres") as SquareMeters;
}

export function cubicMillimeters(value: number): CubicMillimeters {
  return safeInteger(value, "Cubic millimetres") as CubicMillimeters;
}

export function cubicMeters(value: number): CubicMeters {
  return finite(value, "Cubic metres") as CubicMeters;
}

export function degrees(value: number): Degrees {
  return finite(value, "Degrees") as Degrees;
}

export function radians(value: number): Radians {
  return finite(value, "Radians") as Radians;
}

export function cmToMm(value: Centimeters): Millimeters {
  return millimeters(value * 10);
}

export function mToMm(value: Meters): Millimeters {
  return millimeters(value * 1000);
}

export function mmToCm(value: Millimeters): Centimeters {
  return centimeters(value / 10);
}

export function mmToM(value: Millimeters): Meters {
  return meters(value / 1000);
}

export function squareMmToM(value: SquareMillimeters): SquareMeters {
  return squareMeters(value / 1_000_000);
}

export function squareMToMm(value: SquareMeters): SquareMillimeters {
  return squareMillimeters(value * 1_000_000);
}

export function cubicMmToM(value: CubicMillimeters): CubicMeters {
  return cubicMeters(value / 1_000_000_000);
}

export function cubicMToMm(value: CubicMeters): CubicMillimeters {
  return cubicMillimeters(value * 1_000_000_000);
}

export function degreesToRadians(value: Degrees): Radians {
  return radians((value * Math.PI) / 180);
}

export function radiansToDegrees(value: Radians): Degrees {
  return degrees((value * 180) / Math.PI);
}

export function nonNegativeDimension(value: number, label: string): number {
  return nonNegative(value, label);
}
