import type { GableRoofOutput } from "@/domain/calculations/gable-roof";
import type { MaterialPurchasingUnit } from "@/domain/materials/contracts";
import type { AreaMeasurementKey, LinearMeasurementKey, TakeoffEstimate, TakeoffMethod } from "./contracts";

const finiteNonNegative = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} csak nemnegatív, véges szám lehet.`);
  return value;
};

export function estimateArea(output: GableRoofOutput, key: AreaMeasurementKey, allowancePercent: number): TakeoffEstimate {
  const area = finiteNonNegative(output.areas[key], "A terület");
  const allowance = finiteNonNegative(allowancePercent, "A ráhagyás");
  const quantity = area * (1 + allowance / 100);
  return { calculatedQuantity: quantity, finalQuantity: quantity, unit: "square_meter", source: `areas.${key}`, allowancePercent: allowance };
}

export function estimateLinear(output: GableRoofOutput, key: LinearMeasurementKey): TakeoffEstimate {
  const millimeters = finiteNonNegative(output.lengths[key], "A hossz");
  return { calculatedQuantity: millimeters / 1000, finalQuantity: millimeters / 1000, unit: "linear_meter", source: `lengths.${key}`, allowancePercent: null };
}

export function estimateManual(quantity: number, unit: MaterialPurchasingUnit): TakeoffEstimate {
  const value = finiteNonNegative(quantity, "A kézi mennyiség");
  return { calculatedQuantity: null, finalQuantity: value, unit, source: "manual", allowancePercent: null, warning: "Kézi mennyiség; nincs geometriai ellenőrzés." };
}

export function isMethodCompatible(method: TakeoffMethod, unit: MaterialPurchasingUnit): boolean {
  return method === "manual" || (method === "area" && unit === "square_meter") || (method === "linear" && unit === "linear_meter");
}
