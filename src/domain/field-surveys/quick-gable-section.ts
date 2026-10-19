import type { SurveySection } from "./workspace";
import { calculateQuickGable } from "./quick-gable";

/** Exactly what the database recomputes from the revision section (`private.survey_quick_gable_input`). */
export type QuickGableSourceInput = Readonly<{ mode: "quick"; eaveRunMm: number; slopeAMm: number; slopeBMm: number; planesMatch: boolean }>;
export type QuickGableSourceOutput = Readonly<{ areas: { combinedRoofM2: number; planeAM2: number; planeBM2: number }; dimensions: { ridgeMm: number; eaveTotalMm: number; vergeTotalMm: number }; geometryNotes: readonly string[] }>;

const roles = ["roof_eave_run", "roof_plane_slope_a", "roof_plane_slope_b"] as const;

/** Null unless the section is an explicit, complete, unambiguous quick gable measurement; nothing is inferred. */
export function quickGableInputFromSurveySection(section: SurveySection): QuickGableSourceInput | null {
  if (section.workType !== "roof" || section.roofType !== "gable" || section.roofMeasurementMode !== "quick" || section.quickPlanesMatch === undefined) return null;
  const drafts = section.measurements.filter((m) => m.value !== null && (roles as readonly string[]).includes(m.semanticType)).map((m) => ({ id: m.id, semanticType: m.semanticType, unit: m.unit, value: String(m.value) }));
  if (roles.some((role) => drafts.filter((d) => d.semanticType === role).length > 1)) return null;
  const result = calculateQuickGable(drafts, section.quickPlanesMatch);
  if (result.status !== "ok") return null;
  return { mode: "quick", eaveRunMm: result.eaveRunMm, slopeAMm: result.planes[0].slopeMm, slopeBMm: result.planes[1].slopeMm, planesMatch: result.planesMatch };
}

export function quickGableSourceOutput(input: QuickGableSourceInput): QuickGableSourceOutput {
  const m2 = (slope: number) => (input.eaveRunMm * slope) / 1_000_000;
  return {
    areas: { combinedRoofM2: (input.eaveRunMm * (input.slopeAMm + input.slopeBMm)) / 1_000_000, planeAM2: m2(input.slopeAMm), planeBM2: m2(input.slopeBMm) },
    dimensions: { ridgeMm: input.eaveRunMm, eaveTotalMm: 2 * input.eaveRunMm, vergeTotalMm: 2 * (input.slopeAMm + input.slopeBMm) },
    geometryNotes: ["Közvetlenül mért értékekből; a tetősíkok téglalap alakúnak tekintettek. Hajlásszög, emelkedés és túlnyúlás nincs levezetve."],
  };
}
