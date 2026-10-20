import { roofGeometryInputSchema, type RoofGeometryInput, type RoofGeometryType } from "@/domain/calculations/roof-geometry";
import type { FieldSurveyMeasurement, FieldSurveySemanticType } from "./contracts";
import { quickLengthMm, type QuickGableDraft } from "./quick-gable";

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

/**
 * UI grouping of the engine's required fields for the multi-section shapes (hip, pyramid, half-hip, L, T).
 * Only the fields of `surveyRoofFields` appear; nothing is derived or assumed. A null title means a single group.
 */
export type SurveyRoofFieldGroup = Readonly<{ title: string | null; types: readonly FieldSurveySemanticType[] }>;
export function surveyRoofFieldGroups(type: RoofGeometryType): readonly SurveyRoofFieldGroup[] {
  const all = surveyRoofFields(type).map((field) => field.semanticType);
  if (type === "halfHip") return [{ title: "Főtető", types: all.filter((t) => t !== "roof_hip_eave_height") }, { title: "Félkonty", types: ["roof_hip_eave_height"] }];
  if (type === "lShape" || type === "tShape") return [{ title: "Főtető", types: all.filter((t) => t !== "roof_wing_width" && t !== "roof_wing_projection") }, { title: "Szárny", types: ["roof_wing_width", "roof_wing_projection"] }];
  return [{ title: null, types: all }];
}

const crossFieldTarget: Partial<Record<RoofGeometryType, FieldSurveySemanticType>> = { hip: "roof_outer_length", halfHip: "roof_hip_eave_height", lShape: "roof_wing_width", tShape: "roof_wing_width" };

/** Field-level messages for the building-dimension fields (engine limits: 100 m, pitch 0–80°); empty fields stay silent. */
export function surveyRoofFieldMessages(type: Exclude<RoofGeometryType, "gable">, drafts: readonly QuickGableDraft[]): Record<string, string> {
  const messages: Record<string, string> = {};
  const values: Record<string, number> = {};
  for (const field of surveyRoofFields(type)) {
    const draft = drafts.find((item) => item.semanticType === field.semanticType);
    if (!draft || draft.value.trim() === "") continue;
    if (field.unit === "degree") {
      const value = Number(draft.value.trim().replace(",", "."));
      if (!Number.isFinite(value) || value <= 0 || value >= 80) messages[draft.id] = "A hajlásszög 0 és 80 fok között legyen (pl. 20 vagy 22,5).";
      else values[field.key] = value;
      continue;
    }
    const parsed = quickLengthMm(draft);
    if (parsed.error) messages[draft.id] = parsed.error;
    else if (parsed.mm! > 100_000) messages[draft.id] = "A méret legfeljebb 100 m lehet.";
    else values[field.key] = parsed.mm!;
  }
  const keys = surveyRoofFields(type).map((field) => field.key);
  if (!Object.keys(messages).length && keys.every((key) => key in values)) {
    const parsed = roofGeometryInputSchema.safeParse({ type, ...values });
    const target = crossFieldTarget[type];
    const draft = target && drafts.find((item) => item.semanticType === target);
    if (!parsed.success && draft) messages[draft.id] = parsed.error.issues[0]?.message ?? "A megadott méretek együtt nem adnak érvényes tetőt.";
  }
  return messages;
}
