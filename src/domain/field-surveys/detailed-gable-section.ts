import type { SurveySection } from "./workspace";
import { calculateDetailedGable } from "./detailed-gable";

/** Exactly what the database recomputes from the revision section (`private.survey_detailed_gable_input`). */
export type DetailedGableSourceInput = Readonly<{ mode: "detailed"; ridgeMm: number; eaveAMm: number; slopeAMm: number; eaveBMm: number; slopeBMm: number; planesMatch: boolean; vergeAMm: readonly [number, number] | null; vergeBMm: readonly [number, number] | null }>;
export type DetailedGableSourceOutput = Readonly<{ areas: { combinedRoofM2: number }; dimensions: { ridgeMm: number; eaveTotalMm: number; vergeTotalMm: number | null }; geometryNotes: readonly string[] }>;
const roles = ["roof_ridge_length", "roof_eave_a", "roof_eave_b", "roof_plane_slope_a", "roof_plane_slope_b", "roof_verge_a_left", "roof_verge_a_right", "roof_verge_b_left", "roof_verge_b_right"];

/** Null unless the section is an explicit, complete, unambiguous detailed gable measurement. */
export function detailedGableInputFromSurveySection(section: SurveySection): { input: DetailedGableSourceInput; output: DetailedGableSourceOutput } | null {
  if (section.workType !== "roof" || section.roofType !== "gable" || section.roofMeasurementMode !== "detailed" || section.quickPlanesMatch === undefined) return null;
  const drafts = section.measurements.filter((x) => x.value !== null && roles.includes(x.semanticType)).map((x) => ({ id: x.id, semanticType: x.semanticType, unit: x.unit, value: String(x.value) }));
  if (roles.some((role) => drafts.filter((d) => d.semanticType === role).length > 1)) return null;
  const r = calculateDetailedGable(drafts, section.quickPlanesMatch);
  if (r.status !== "ok") return null;
  const [a, b] = r.planes;
  return {
    input: { mode: "detailed", ridgeMm: r.ridgeMm, eaveAMm: a.eaveMm, slopeAMm: a.slopeMm, eaveBMm: b.eaveMm, slopeBMm: b.slopeMm, planesMatch: r.planesMatch, vergeAMm: a.vergeMm, vergeBMm: b.vergeMm },
    output: { areas: { combinedRoofM2: r.totalAreaM2 }, dimensions: { ridgeMm: r.ridgeMm, eaveTotalMm: r.eaveTotalMm, vergeTotalMm: r.vergeTotalMm }, geometryNotes: ["Közvetlenül mért méretekből; minden sík trapéz (eresz, közös gerinc, merőleges lejtő menti hossz). Hajlásszög nincs levezetve."] },
  };
}
