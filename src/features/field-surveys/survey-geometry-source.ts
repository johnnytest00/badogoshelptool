import "server-only";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { gableGeometryFromSurveySection } from "@/domain/field-surveys/gable-section-geometry";
import { multiRoofGeometryFromSurveySection } from "@/domain/field-surveys/multi-roof-section-geometry";
import { surveySections } from "@/domain/field-surveys/workspace";
import { persistSurveyMultiRoofGeometrySource, persistSurveyRoofGeometrySource } from "@/infrastructure/supabase/survey-geometry-source-writer";
import type { FieldSurveyRevisionRecord } from "./field-survey-data";

/**
 * Records the verified roof area of every complete, supported roof section of an exact saved survey revision
 * (gable via the dedicated engine; shed/hip/pyramid/halfHip/lShape/tShape via the general roof geometry
 * engine). Idempotent (unique per revision + section); needs no project, roof model or work log. The
 * geometry is computed server-side by the existing engines, and the database re-checks the input against
 * the revision.
 */
export async function recordSurveyRoofGeometrySources(organizationId: string, revision: FieldSurveyRevisionRecord, actorId: string): Promise<{ recorded: number; failed: number }> {
  let recorded = 0; let failed = 0;
  const revisionRef = { surveyId: revision.surveyId, id: revision.id, version: revision.version };
  for (const section of surveySections(revision)) {
    if (section.workType !== "roof") continue;
    const gableInput = gableGeometryFromSurveySection(revisionRef, section);
    if (gableInput) {
      try {
        await persistSurveyRoofGeometrySource({ organizationId, surveyId: revision.surveyId, surveyRevisionId: revision.id, sectionId: section.id, input: gableInput, output: calculateGableRoof(gableInput), actorId });
        recorded += 1;
      } catch { failed += 1; }
      continue;
    }
    const multiInput = multiRoofGeometryFromSurveySection(section);
    if (!multiInput) continue;
    try {
      await persistSurveyMultiRoofGeometrySource({ organizationId, surveyId: revision.surveyId, surveyRevisionId: revision.id, sectionId: section.id, roofType: multiInput.type, input: multiInput, output: calculateRoofGeometry(multiInput), actorId });
      recorded += 1;
    } catch { failed += 1; }
  }
  return { recorded, failed };
}
