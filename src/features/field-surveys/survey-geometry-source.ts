import "server-only";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { gableGeometryFromSurveySection } from "@/domain/field-surveys/gable-section-geometry";
import { surveySections } from "@/domain/field-surveys/workspace";
import { persistSurveyRoofGeometrySource } from "@/infrastructure/supabase/survey-geometry-source-writer";
import type { FieldSurveyRevisionRecord } from "./field-survey-data";

/**
 * Records the verified roof area of every complete gable roof section of an exact saved survey revision.
 * Idempotent (unique per revision + section); needs no project, roof model or work log. The geometry is
 * computed server-side by the existing engine, and the database re-checks the input against the revision.
 */
export async function recordSurveyRoofGeometrySources(organizationId: string, revision: FieldSurveyRevisionRecord, actorId: string): Promise<{ recorded: number; failed: number }> {
  let recorded = 0; let failed = 0;
  for (const section of surveySections(revision)) {
    if (section.workType !== "roof") continue;
    const input = gableGeometryFromSurveySection({ surveyId: revision.surveyId, id: revision.id, version: revision.version }, section);
    if (!input) continue;
    try {
      await persistSurveyRoofGeometrySource({ organizationId, surveyId: revision.surveyId, surveyRevisionId: revision.id, sectionId: section.id, input, output: calculateGableRoof(input), actorId });
      recorded += 1;
    } catch { failed += 1; }
  }
  return { recorded, failed };
}
