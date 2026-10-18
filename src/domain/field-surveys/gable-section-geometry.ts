import { gableRoofInputSchema, type GableRoofInput } from "@/domain/calculations/gable-roof";
import { mapFieldSurveyToCalculator } from "@/domain/field-surveys/calculator-handoff";
import { completeSectionMeasurements, type SurveySection } from "@/domain/field-surveys/workspace";

/**
 * Maps one roof section of an exact survey revision to the existing gable roof input. Roof mathematics stays in
 * `calculateGableRoof`; this only maps units/semantic roles and returns null for incomplete or invalid sections.
 */
export function gableGeometryFromSurveySection(
  revision: Readonly<{ surveyId: string; id: string; version: number }>,
  section: SurveySection,
): GableRoofInput | null {
  const handoff = mapFieldSurveyToCalculator({ surveyId: revision.surveyId, revisionId: revision.id, version: revision.version, workType: "roof", measurements: completeSectionMeasurements(section) });
  if (!handoff.ok || handoff.calculator !== "roof" || handoff.missing.length) return null;
  const raw = handoff.input;
  const parsed = gableRoofInputSchema.safeParse({ inputMode: raw.inputMode, buildingLengthMm: Number(raw.buildingLengthMm), buildingWidthMm: Number(raw.buildingWidthMm), eaveOverhangMm: Number(raw.eaveOverhangMm), frontGableOverhangMm: Number(raw.frontGableOverhangMm), rearGableOverhangMm: Number(raw.rearGableOverhangMm), ...(raw.inputMode === "height" ? { roofRiseMm: Number(raw.roofRiseMm) } : { roofPitchDegrees: Number(raw.roofPitchDegrees) }) });
  return parsed.success ? parsed.data : null;
}
