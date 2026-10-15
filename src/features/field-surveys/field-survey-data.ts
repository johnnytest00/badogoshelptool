import { createClient } from "@/infrastructure/supabase/server";
import type { Database } from "@/infrastructure/supabase/database.types";
import type { FieldSurveyMeasurement, FieldSurveyWorkType } from "@/domain/field-surveys/contracts";

export type FieldSurveyRecord = {
  id: string;
  organizationId: string;
  projectId: string | null;
  createdBy: string;
  workType: FieldSurveyWorkType;
  measurements: FieldSurveyMeasurement[];
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type FieldSurveyRevisionRecord = {
  id: string;
  surveyId: string;
  organizationId: string;
  projectId: string | null;
  version: number;
  workType: FieldSurveyWorkType;
  measurements: FieldSurveyMeasurement[];
  notes: string | null;
  photosSnapshot: unknown[];
  createdAt: string;
};

type SurveyRow = Database["public"]["Tables"]["field_surveys"]["Row"];

function mapSurvey(row: SurveyRow): FieldSurveyRecord {
  return {
    id: row.id, organizationId: row.organization_id, projectId: row.project_id,
    createdBy: row.created_by, workType: row.work_type as FieldSurveyWorkType,
    measurements: row.measurements as unknown as FieldSurveyMeasurement[], notes: row.notes,
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function getFieldSurveys(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("field_surveys")
    .select("id, organization_id, project_id, created_by, updated_by, work_type, measurements, notes, version, created_at, updated_at")
    .eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error("A felmérések betöltése nem sikerült.");
  return (data ?? []).map(mapSurvey);
}

export async function getFieldSurvey(organizationId: string, surveyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("field_surveys")
    .select("id, organization_id, project_id, created_by, updated_by, work_type, measurements, notes, version, created_at, updated_at")
    .eq("organization_id", organizationId).eq("id", surveyId).maybeSingle();
  if (error) throw new Error("A felmérés betöltése nem sikerült.");
  return data ? mapSurvey(data) : null;
}

export async function getFieldSurveyRevision(organizationId: string, surveyId: string, version: number): Promise<FieldSurveyRevisionRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("field_survey_revisions")
    .select("id, survey_id, organization_id, project_id, version, work_type, measurements, notes, photos_snapshot, created_by, created_at")
    .eq("organization_id", organizationId).eq("survey_id", surveyId).eq("version", version).maybeSingle();
  if (error) throw new Error("A kiválasztott felmérésrevízió nem tölthető be.");
  return data ? {
    id: data.id, surveyId: data.survey_id, organizationId: data.organization_id, projectId: data.project_id,
    version: data.version, workType: data.work_type as FieldSurveyWorkType,
    measurements: data.measurements as unknown as FieldSurveyMeasurement[], notes: data.notes,
    photosSnapshot: data.photos_snapshot as unknown[], createdAt: data.created_at,
  } : null;
}

export async function getFieldSurveyRevisionVersions(organizationId: string, surveyId: string): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("field_survey_revisions")
    .select("version").eq("organization_id", organizationId).eq("survey_id", surveyId).order("version", { ascending: false });
  if (error) throw new Error("A felmérés változatai nem tölthetők be.");
  return (data ?? []).map((item) => item.version);
}
