import type { SurveySection } from "./workspace";
import { calculateQuickShed } from "./quick-shed";

/** Exactly what the database recomputes from the revision section (`private.survey_quick_shed_input`). */
export type QuickShedSourceInput = Readonly<{ mode: "quick"; eaveRunMm: number; slopeMm: number }>;
export type QuickShedSourceOutput = Readonly<{ areas: { combinedRoofM2: number }; dimensions: { eaveMm: number; upperMm: number; rakeTotalMm: number }; geometryNotes: readonly string[] }>;

const roles = ["roof_eave_run", "roof_plane_slope_a"] as const;

/** Null unless the section is an explicit, complete, unambiguous quick single-slope measurement; nothing is inferred. */
export function quickShedInputFromSurveySection(section: SurveySection): QuickShedSourceInput | null {
  if (section.workType !== "roof" || section.roofType !== "shed" || section.roofMeasurementMode !== "quick") return null;
  const drafts = section.measurements.filter((m) => m.value !== null && (roles as readonly string[]).includes(m.semanticType)).map((m) => ({ id: m.id, semanticType: m.semanticType, unit: m.unit, value: String(m.value) }));
  if (roles.some((role) => drafts.filter((d) => d.semanticType === role).length > 1)) return null;
  const result = calculateQuickShed(drafts);
  return result.status === "ok" ? { mode: "quick", eaveRunMm: result.eaveRunMm, slopeMm: result.slopeMm } : null;
}

export function quickShedSourceOutput(input: QuickShedSourceInput): QuickShedSourceOutput {
  return {
    areas: { combinedRoofM2: (input.eaveRunMm * input.slopeMm) / 1_000_000 },
    dimensions: { eaveMm: input.eaveRunMm, upperMm: input.eaveRunMm, rakeTotalMm: 2 * input.slopeMm },
    geometryNotes: ["Közvetlenül mért értékekből; a tetősík téglalap alakúnak tekintett. Hajlásszög, emelkedés és túlnyúlás nincs levezetve."],
  };
}
