import { roofGeometryInputSchema, type RoofGeometryInput, type RoofGeometryType } from "@/domain/calculations/roof-geometry";
import type { FieldSurveyMeasurement, FieldSurveySemanticType } from "./contracts";

type RoofField = Readonly<{ semanticType: FieldSurveySemanticType; label: string; unit: "mm" | "degree"; key: string }>;
const length = (semanticType: FieldSurveySemanticType, label: string, key: string): RoofField => ({ semanticType, label, unit: "mm", key });
const pitch: RoofField = { semanticType: "roof_pitch", label: "Tetőhajlásszög", unit: "degree", key: "pitchDegrees" };
const outerLength = length("roof_outer_length", "Tető külső hossza", "lengthMm");
const outerWidth = length("roof_outer_width", "Tető külső szélessége", "widthMm");
const wingWidth = length("roof_wing_width", "Csatlakozó szárny külső szélessége", "wingWidthMm");
const wingProjection = length("roof_wing_projection", "Szárny kinyúlása", "wingProjectionMm");

export function surveyRoofFields(type: RoofGeometryType): readonly RoofField[] {
  if (type === "gable") return [];
  if (type === "pyramid") return [length("roof_outer_side", "Tető külső oldalhossza", "sideMm"), pitch];
  const fields = [outerLength, outerWidth, pitch];
  if (type === "halfHip") fields.push(length("roof_hip_eave_height", "Félkonty alsó élének magassága", "hipEaveHeightMm"));
  if (type === "lShape" || type === "tShape") fields.push(wingWidth, wingProjection);
  return fields;
}

export function geometryFromSurveyMeasurements(type: Exclude<RoofGeometryType, "gable">, measurements: readonly FieldSurveyMeasurement[]): RoofGeometryInput | null {
  const values: Record<string, number> = {};
  for (const field of surveyRoofFields(type)) {
    const matching = measurements.filter((item) => item.semanticType === field.semanticType);
    if (matching.length !== 1) return null;
    const measured = matching[0];
    if (field.unit === "degree" && measured.unit !== "degree") return null;
    if (field.unit === "mm" && measured.unit !== "mm" && measured.unit !== "m") return null;
    const value = measured.value * (measured.unit === "m" ? 1000 : 1);
    if (!Number.isFinite(value) || (field.unit === "mm" && !Number.isSafeInteger(value))) return null;
    values[field.key] = value;
  }
  const parsed = roofGeometryInputSchema.safeParse({ type, ...values });
  return parsed.success ? parsed.data : null;
}
