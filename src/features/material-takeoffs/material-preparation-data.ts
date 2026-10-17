import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";
import type { MaterialPreparationItem, PreparationSourceSnapshot } from "@/domain/material-preparations/contracts";
import type { SurveyMaterialProvenanceItem } from "@/domain/material-takeoffs/survey-material-suggestions";
import { fieldSurveyWorkTypeLabels, type FieldSurveyWorkType } from "@/domain/field-surveys/contracts";

type PreparationRevisionRow = {
  id: string;
  list_id: string;
  revision_number: number;
  preparation_state: "preliminary" | "ready";
  source_takeoffs_snapshot: Json;
  items_snapshot: Json;
  created_at: string;
  created_by: string;
};

export type MaterialPreparationRevision = Readonly<{
  id: string;
  revisionNumber: number;
  state: "preliminary" | "ready";
  sourceTakeoffs: readonly PreparationSourceSnapshot[];
  items: readonly MaterialPreparationItem[];
  createdAt: string;
  staleTakeoffIds: readonly string[];
  surveySource: MaterialPreparationSurveySource | null;
}>;

export type MaterialPreparationSurveySource = Readonly<{
  surveyId: string;
  surveyRevisionId: string;
  surveyVersion: number;
  surveyName: string;
  currentSurveyVersion: number | null;
  stale: boolean;
  items: readonly SurveyMaterialProvenanceItem[];
}>;

export type MaterialPreparationList = Readonly<{
  id: string;
  projectId: string | null;
  executionPlanId: string | null;
  name: string;
  version: number;
  updatedAt: string;
  currentRevisionId: string | null;
  currentRevision: MaterialPreparationRevision | null;
  history: readonly MaterialPreparationRevision[];
}>;

const jsonArray = <T,>(value: Json): T[] => Array.isArray(value) ? value as T[] : [];

export function surveyNameFromRevision(workType: string, sections: Json | null): string {
  const names = Array.isArray(sections)
    ? sections.flatMap((section) => section && typeof section === "object" && !Array.isArray(section)
      && typeof section.name === "string" && section.name.trim() ? [section.name.trim()] : [])
    : [];
  if (names.length) return [...new Set(names)].join(" · ");
  return fieldSurveyWorkTypeLabels[workType as FieldSurveyWorkType] ?? "Felmérés";
}

export async function getMaterialPreparationLists(organizationId: string, projectId: string, currentSourceRevisions: ReadonlyMap<string, string | null>): Promise<MaterialPreparationList[]> {
  const supabase = await createClient();
  const { data: lists, error: listError } = await supabase.from("material_preparation_lists")
    .select("id, organization_id, project_id, execution_plan_id, name, current_revision_id, version, updated_at")
    .eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false }).limit(100);
  if (listError) throw new Error("Az előkészítési listák betöltése nem sikerült.");
  if (!lists?.length) return [];
  const { data: revisions, error: revisionError } = await supabase.from("material_preparation_revisions")
    .select("id, list_id, revision_number, preparation_state, source_takeoffs_snapshot, items_snapshot, created_at, created_by")
    .eq("organization_id", organizationId).in("list_id", lists.map((list) => list.id))
    .order("revision_number", { ascending: false }).limit(1000);
  if (revisionError) throw new Error("Az előkészítési lista korábbi változatai nem tölthetők be.");

  const mapRevision = (row: PreparationRevisionRow): MaterialPreparationRevision => {
    const sourceTakeoffs = jsonArray<PreparationSourceSnapshot>(row.source_takeoffs_snapshot);
    const staleTakeoffIds = sourceTakeoffs.flatMap((source) => {
      const currentRevisionId = currentSourceRevisions.get(source.takeoffId);
      return currentRevisionId !== undefined && currentRevisionId !== source.calculationRevisionId ? [source.takeoffId] : [];
    });
    return {
      id: row.id,
      revisionNumber: row.revision_number,
      state: row.preparation_state,
      sourceTakeoffs,
      items: jsonArray<MaterialPreparationItem>(row.items_snapshot),
      createdAt: row.created_at,
      staleTakeoffIds,
      surveySource: null,
    };
  };
  const revisionRows = (revisions ?? []) as PreparationRevisionRow[];
  return lists.map((list) => {
    const history = revisionRows.filter((revision) => revision.list_id === list.id).map(mapRevision);
    return {
      id: list.id,
      projectId: list.project_id,
      executionPlanId: list.execution_plan_id,
      name: list.name,
      version: list.version,
      updatedAt: list.updated_at,
      currentRevisionId: list.current_revision_id,
      currentRevision: history.find((revision) => revision.id === list.current_revision_id) ?? null,
      history,
    };
  });
}

export async function getWorkflowMaterialLists(organizationId: string): Promise<MaterialPreparationList[]> {
  const supabase = await createClient();
  const { data: lists, error: listError } = await supabase.from("material_preparation_lists")
    .select("id, organization_id, project_id, execution_plan_id, name, current_revision_id, version, updated_at")
    .eq("organization_id", organizationId).is("project_id", null)
    .order("updated_at", { ascending: false }).limit(200);
  if (listError) throw new Error("Az anyaglisták betöltése nem sikerült.");
  if (!lists?.length) return [];
  const { data: revisions, error: revisionError } = await supabase.from("material_preparation_revisions")
    .select("id, list_id, revision_number, preparation_state, source_takeoffs_snapshot, items_snapshot, created_at, created_by")
    .eq("organization_id", organizationId).in("list_id", lists.map((list) => list.id))
    .order("revision_number", { ascending: false }).limit(2000);
  if (revisionError) throw new Error("Az anyaglista korábbi változatai nem tölthetők be.");
  const rows = (revisions ?? []) as PreparationRevisionRow[];
  const listIds = lists.map((list) => list.id);
  const { data: sourceRows, error: sourceError } = rows.length ? await supabase.from("material_preparation_survey_sources")
    .select("organization_id,material_list_id,material_revision_id,survey_id,survey_revision_id,survey_version,source_items_snapshot,created_by,created_at")
    .eq("organization_id", organizationId).in("material_list_id", listIds) : { data: [], error: null };
  if (sourceError) throw new Error("Az anyaglista felmérésforrásai nem tölthetők be.");
  const surveyIds = [...new Set((sourceRows ?? []).map((source) => source.survey_id))];
  const surveyRevisionIds = [...new Set((sourceRows ?? []).map((source) => source.survey_revision_id))];
  const [surveyResult, sourceRevisionResult] = await Promise.all([
    surveyIds.length ? supabase.from("field_surveys")
      .select("id,version").eq("organization_id", organizationId).in("id", surveyIds) : Promise.resolve({ data: [], error: null }),
    surveyRevisionIds.length ? supabase.from("field_survey_revisions")
      .select("id,survey_id,work_type,sections").eq("organization_id", organizationId).in("id", surveyRevisionIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const { data: surveys, error: surveyError } = surveyResult;
  if (surveyError) throw new Error("A felmérésforrások frissessége nem ellenőrizhető.");
  const { data: sourceRevisions, error: sourceRevisionError } = sourceRevisionResult;
  if (sourceRevisionError) throw new Error("A pontos forrásfelmérés neve nem tölthető be.");
  const currentSurveyVersions = new Map((surveys ?? []).map((survey) => [survey.id, survey.version]));
  const sourceSurveyNames = new Map((sourceRevisions ?? []).map((revision) => [revision.id, {
    surveyId: revision.survey_id,
    name: surveyNameFromRevision(revision.work_type, revision.sections),
  }] as const));
  const sourceByRevision = new Map((sourceRows ?? []).map((row) => {
    const currentSurveyVersion = currentSurveyVersions.get(row.survey_id) ?? null;
    const exactRevision = sourceSurveyNames.get(row.survey_revision_id);
    return [row.material_revision_id, {
      surveyId: row.survey_id,
      surveyRevisionId: row.survey_revision_id,
      surveyVersion: row.survey_version,
      surveyName: exactRevision?.surveyId === row.survey_id ? exactRevision.name : "Felmérés",
      currentSurveyVersion,
      stale: currentSurveyVersion !== null && currentSurveyVersion > row.survey_version,
      items: jsonArray<SurveyMaterialProvenanceItem>(row.source_items_snapshot),
    }] as const;
  }));
  return lists.map((list) => {
    const history = rows.filter((revision) => revision.list_id === list.id).map((row) => ({
      id: row.id, revisionNumber: row.revision_number, state: row.preparation_state,
      sourceTakeoffs: jsonArray<PreparationSourceSnapshot>(row.source_takeoffs_snapshot),
      items: jsonArray<MaterialPreparationItem>(row.items_snapshot), createdAt: row.created_at,
      staleTakeoffIds: [],
      surveySource: sourceByRevision.get(row.id) ?? null,
    }));
    return {
      id: list.id, projectId: list.project_id, executionPlanId: list.execution_plan_id,
      name: list.name, version: list.version, updatedAt: list.updated_at,
      currentRevisionId: list.current_revision_id,
      currentRevision: history.find((revision) => revision.id === list.current_revision_id) ?? null,
      history,
    };
  });
}
