/**
 * Linear-length input layer: users type mm, cm or m; calculations keep canonical millimetres.
 * Conversion shifts decimal digits as text, so no floating point multiplication can drift
 * (e.g. 1,001 m is exactly 1001 mm, not 1000.9999…).
 */
export const LENGTH_UNITS = ["mm", "cm", "m"] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];
export const DEFAULT_LENGTH_UNIT: LengthUnit = "cm";
export const MAX_LENGTH_INPUT_MM = 1_000_000;

const DECIMAL_SHIFT: Record<LengthUnit, number> = { mm: 0, cm: 1, m: 3 };

export type LengthParseResult =
  | { state: "empty" }
  | { state: "incomplete" }
  | { state: "invalid"; error: string }
  | { state: "valid"; mm: number };

export type LengthInputOptions = Readonly<{
  /** Millimetre decimals the field's contract accepts; 0 is the integer-millimetre contract. */
  mmDecimals?: number;
  maxMm?: number;
}>;

export function parseLengthInput(text: string, unit: LengthUnit, { mmDecimals = 0, maxMm = MAX_LENGTH_INPUT_MM }: LengthInputOptions = {}): LengthParseResult {
  const compact = text.replace(/\s/g, "");
  if (compact === "") return { state: "empty" };
  if (compact === "-" || compact === "," || compact === ".") return { state: "incomplete" };
  if (compact.startsWith("-")) return { state: "invalid", error: "A méret nem lehet negatív." };
  const match = /^(\d*)(?:[.,](\d*))?$/.exec(compact);
  if (!match || (match[1] === "" && !match[2])) return { state: "invalid", error: "Adj meg érvényes számot, pl. 250 vagy 2,5." };

  const shift = DECIMAL_SHIFT[unit];
  const fraction = match[2] ?? "";
  const wholeMm = `${match[1]}${fraction.slice(0, shift).padEnd(shift, "0")}`.replace(/^0+(?=\d)/, "") || "0";
  const fractionMm = fraction.slice(shift).replace(/0+$/, "");
  if (fractionMm.length > mmDecimals) {
    return { state: "invalid", error: mmDecimals === 0
      ? "Ez a méret egész milliméter pontosságú; adj meg kevesebb tizedesjegyet vagy válts mm-re."
      : `Legfeljebb ${formatLength(10 ** -mmDecimals, "mm")} mm pontosság adható meg.` };
  }

  const value = Number(fractionMm ? `${wholeMm}.${fractionMm}` : wholeMm);
  if (!Number.isFinite(value) || value > maxMm) return { state: "invalid", error: `A méret legfeljebb ${formatLength(maxMm, "m")} m lehet.` };
  return { state: "valid", mm: value };
}

/** Canonical millimetres shown exactly in the given unit with a decimal comma. */
export function formatLength(mm: number, unit: LengthUnit): string {
  // toFixed(10) avoids exponent notation; trailing zeros are trimmed below.
  const [whole, fraction = ""] = Math.abs(mm).toFixed(10).split(".");
  const digits = `${whole.padStart(DECIMAL_SHIFT[unit] + 1, "0")}${fraction}`;
  const point = whole.padStart(DECIMAL_SHIFT[unit] + 1, "0").length - DECIMAL_SHIFT[unit];
  const integer = digits.slice(0, point).replace(/^0+(?=\d)/, "");
  const decimals = digits.slice(point).replace(/0+$/, "");
  return `${mm < 0 ? "-" : ""}${decimals ? `${integer},${decimals}` : integer}`;
}
