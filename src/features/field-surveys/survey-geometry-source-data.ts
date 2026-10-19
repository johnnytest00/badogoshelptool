import type { SurveyRoofGeometrySource } from "@/domain/field-surveys/workspace";
import { createClient } from "@/infrastructure/supabase/server";

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
function edgesOf(row: { geometry_type: string; output_snapshot: Record<string, Record<string, unknown> | undefined> | null }): SurveyRoofGeometrySource["edges"] {
  const out = row.output_snapshot;
  if (row.geometry_type === "roof.gable.quick" || row.geometry_type === "roof.gable.detailed") return { eave_total: num(out?.dimensions?.eaveTotalMm), ridge: num(out?.dimensions?.ridgeMm), verge_total: num(out?.dimensions?.vergeTotalMm) };
  if (row.geometry_type === "roof.gable") return { eave_total: num(out?.lengths?.totalEaveEdgesMm), ridge: num(out?.lengths?.ridgeLineMm), verge_total: num(out?.lengths?.totalSlopingGableEdgesMm) };
  return undefined;
}

/** RLS-scoped read of the immutable, verified roof areas recorded for a survey's exact revisions. */
export async function getSurveyRoofGeometrySources(organizationId: string, surveyId: string): Promise<SurveyRoofGeometrySource[]> {
  const client = await createClient();
  // Table added after the last generated types snapshot; the row shape is fixed by the migration.
  type Row = { id: string; section_id: string; survey_revision_id: string; combined_roof_m2: number | string; geometry_type: string; output_snapshot: Record<string, Record<string, unknown> | undefined> | null };
  const table = (client as unknown as { from(name: string): { select(columns: string): { eq(column: string, value: string): { eq(column: string, value: string): Promise<{ data: Row[] | null; error: unknown }> } } } }).from("field_survey_roof_geometry_sources");
  const { data, error } = await table.select("id,section_id,survey_revision_id,combined_roof_m2,geometry_type,output_snapshot").eq("organization_id", organizationId).eq("survey_id", surveyId);
  if (error) throw new Error("A felmérés ellenőrzött tetőgeometriája nem tölthető be.");
  return (data ?? []).map((row) => ({ id: row.id, sectionId: row.section_id, surveyRevisionId: row.survey_revision_id, combinedRoofM2: Number(row.combined_roof_m2), edges: edgesOf(row) }));
}
