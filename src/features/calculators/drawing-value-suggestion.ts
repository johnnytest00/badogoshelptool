import type { DrawingTextMethod } from "@/infrastructure/drawings/drawing-text-source";

const measurementPattern = /(?<![\p{L}\p{N}])(\d+(?:[.,]\d{1,2})?)\s*(mm|cm|m²|m2|m|°|deg|fok|%|db)(?![\p{L}\p{N}])/giu;
const numberPattern = /\d+(?:[.,]\d+)?/gu;
const compoundDimensionPattern = /\d+(?:[.,]\d+)?\s*[x×/]\s*\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?/iu;
const lengthToMm: Readonly<Record<string, number>> = { mm: 1, cm: 10, m: 1000 };

function measurementFromText(text: string, method: DrawingTextMethod) {
  if (method !== "pdf-text" || compoundDimensionPattern.test(text)) return null;
  const numbers = [...text.matchAll(numberPattern)];
  if (numbers.length !== 1) return null;
  const token = numbers[0]!;
  if (text[token.index! - 1] === "-" || text[token.index! - 1] === "+") return null;

  const explicit = [...text.matchAll(measurementPattern)];
  if (explicit.length === 1) {
    const [, rawValue, rawUnit] = explicit[0]!;
    return { value: Number(rawValue.replace(",", ".")), sourceUnit: rawUnit.toLowerCase(), unitOrigin: "pdf" as const };
  }
  if (explicit.length > 0 || /^\s*(?:[\p{L}%°²]{1,3}\b|[°%²])/u.test(text.slice(token.index! + token[0].length))) return null;
  return { value: Number(token[0].replace(",", ".")), sourceUnit: null, unitOrigin: "user" as const };
}

/** The single number a label states, whatever unit it carries; null when the label is not one plain measurement. */
export function singleNumberFrom(text: string, method: DrawingTextMethod) {
  const measurement = measurementFromText(text, method);
  return measurement && Number.isFinite(measurement.value) && measurement.value > 0 ? measurement.value : null;
}

export function isUnitlessDrawingMeasurement(text: string, method: DrawingTextMethod) {
  const measurement = measurementFromText(text, method);
  return Boolean(measurement && measurement.value > 0 && measurement.sourceUnit === null);
}

export function suggestDrawingValue(text: string, method: DrawingTextMethod, targetUnit: string, selectedUnit?: string) {
  const measurement = measurementFromText(text, method);
  if (!measurement || !Number.isFinite(measurement.value) || measurement.value <= 0) return null;
  const sourceUnit = measurement.sourceUnit ?? selectedUnit?.toLowerCase();
  if (!sourceUnit) return null;

  if (sourceUnit in lengthToMm && targetUnit in lengthToMm) {
    return { value: String(measurement.value * lengthToMm[sourceUnit] / lengthToMm[targetUnit]), sourceUnit, targetUnit, unitOrigin: measurement.unitOrigin };
  }
  if (measurement.sourceUnit && ["°", "deg", "fok"].includes(sourceUnit) && targetUnit === "°") {
    return { value: String(measurement.value), sourceUnit, targetUnit, unitOrigin: measurement.unitOrigin };
  }
  if (measurement.sourceUnit && sourceUnit === "db" && targetUnit === "db" && Number.isInteger(measurement.value)) {
    return { value: String(measurement.value), sourceUnit, targetUnit, unitOrigin: measurement.unitOrigin };
  }
  return null;
}
