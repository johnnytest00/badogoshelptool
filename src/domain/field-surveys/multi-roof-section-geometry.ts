import { geometryFromSurveyMeasurements } from "./roof-geometry";
import { completeSectionMeasurements, type SurveySection } from "./workspace";
import type { RoofGeometryInput } from "@/domain/calculations/roof-geometry";

/**
 * Maps a non-gable roof section of a survey to the general roof geometry input (shed/hip/pyramid/halfHip/
 * lShape/tShape). Mirrors `gableGeometryFromSurveySection` for the shapes already supported by the general
 * `calculateRoofGeometry` engine; returns null when the section has no roof type, is gable (handled
 * separately), or its measurements are incomplete/invalid.
 */
export function multiRoofGeometryFromSurveySection(section: SurveySection): RoofGeometryInput | null {
  if (!section.roofType || section.roofType === "gable") return null;
  return geometryFromSurveyMeasurements(section.roofType, completeSectionMeasurements(section));
}
