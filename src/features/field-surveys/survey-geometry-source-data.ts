import type { SurveyRoofGeometrySource } from "@/domain/field-surveys/workspace";
import { createClient } from "@/infrastructure/supabase/server";

/** RLS-scoped read of the immutable, verified roof areas recorded for a survey's exact revisions. */
export async function getSurveyRoofGeometrySources(organizationId: string, surveyId: string): Promise<SurveyRoofGeometrySource[]> {
  const client = await createClient();
  // Table added after the last generated types snapshot; the row shape is fixed by the migration.
  type Row = { id: string; section_id: string; survey_revision_id: string; combined_roof_m2: number | string };
  const table = (client as unknown as { from(name: string): { select(columns: string): { eq(column: string, value: string): { eq(column: string, value: string): Promise<{ data: Row[] | null; error: unknown }> } } } }).from("field_survey_roof_geometry_sources");
  const { data, error } = await table.select("id,section_id,survey_revision_id,combined_roof_m2").eq("organization_id", organizationId).eq("survey_id", surveyId);
  if (error) throw new Error("A felmérés ellenőrzött tetőgeometriája nem tölthető be.");
  return (data ?? []).map((row) => ({ id: row.id, sectionId: row.section_id, surveyRevisionId: row.survey_revision_id, combinedRoofM2: Number(row.combined_roof_m2) }));
}
