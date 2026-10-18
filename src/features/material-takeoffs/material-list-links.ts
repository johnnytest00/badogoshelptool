import { createClient } from "@/infrastructure/supabase/server";

export type LinkedQuotationDraft = Readonly<{
  quotationId: string;
  name: string;
  status: string;
  sourceListVersion: number | null;
  currentListVersion: number | null;
  createdAt: string;
}>;

export type SurveyLinkedMaterialList = Readonly<{
  listId: string;
  name: string;
  version: number;
  updatedAt: string;
  itemCount: number;
  surveyVersion: number;
  quotations: readonly LinkedQuotationDraft[];
}>;

/** Quotations whose exact source is a revision of the given material lists; RLS keeps this creator/org scoped. */
export async function getQuotationsForMaterialLists(organizationId: string, listIds: readonly string[]): Promise<ReadonlyMap<string, LinkedQuotationDraft[]>> {
  const byList = new Map<string, LinkedQuotationDraft[]>();
  if (!listIds.length) return byList;
  const supabase = await createClient();
  const { data: sources, error } = await supabase.from("quotation_material_list_sources")
    .select("quotation_id, material_list_id, material_revision_id, created_at")
    .eq("organization_id", organizationId).in("material_list_id", [...listIds]).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("A kapcsolt ajánlatok nem tölthetők be.");
  if (!sources?.length) return byList;
  const quotationIds = [...new Set(sources.map((source) => source.quotation_id))];
  const revisionIds = [...new Set(sources.map((source) => source.material_revision_id))];
  const [quotations, revisions, lists] = await Promise.all([
    supabase.from("quotations").select("id, name, status").eq("organization_id", organizationId).in("id", quotationIds),
    supabase.from("material_preparation_revisions").select("id, revision_number").eq("organization_id", organizationId).in("id", revisionIds),
    supabase.from("material_preparation_lists").select("id, version").eq("organization_id", organizationId).in("id", [...new Set(sources.map((source) => source.material_list_id))]),
  ]);
  if (quotations.error || revisions.error || lists.error) throw new Error("A kapcsolt ajánlatok adatai nem tölthetők be.");
  const quotationById = new Map((quotations.data ?? []).map((row) => [row.id, row]));
  const revisionNumber = new Map((revisions.data ?? []).map((row) => [row.id, row.revision_number]));
  const listVersion = new Map((lists.data ?? []).map((row) => [row.id, row.version]));
  const seen = new Set<string>();
  for (const source of sources) {
    const quotation = quotationById.get(source.quotation_id);
    const key = `${source.material_list_id}:${source.quotation_id}`;
    if (!quotation || seen.has(key)) continue;
    seen.add(key);
    const entry: LinkedQuotationDraft = {
      quotationId: quotation.id, name: quotation.name, status: quotation.status,
      sourceListVersion: revisionNumber.get(source.material_revision_id) ?? null,
      currentListVersion: listVersion.get(source.material_list_id) ?? null,
      createdAt: source.created_at,
    };
    byList.set(source.material_list_id, [...(byList.get(source.material_list_id) ?? []), entry]);
  }
  return byList;
}

/** Workflow material lists whose exact survey source is any revision of the given survey. */
export async function getSurveyLinkedMaterialLists(organizationId: string, surveyId: string): Promise<SurveyLinkedMaterialList[]> {
  const supabase = await createClient();
  const { data: sources, error } = await supabase.from("material_preparation_survey_sources")
    .select("material_list_id, material_revision_id, survey_version")
    .eq("organization_id", organizationId).eq("survey_id", surveyId).limit(500);
  if (error) throw new Error("A felmérés anyaglistái nem tölthetők be.");
  if (!sources?.length) return [];
  const listIds = [...new Set(sources.map((source) => source.material_list_id))];
  const { data: lists, error: listError } = await supabase.from("material_preparation_lists")
    .select("id, name, version, updated_at, current_revision_id, project_id")
    .eq("organization_id", organizationId).in("id", listIds).order("updated_at", { ascending: false });
  if (listError) throw new Error("A felmérés anyaglistái nem tölthetők be.");
  const currentRevisionIds = (lists ?? []).flatMap((list) => list.current_revision_id ? [list.current_revision_id] : []);
  const { data: revisions, error: revisionError } = currentRevisionIds.length
    ? await supabase.from("material_preparation_revisions").select("id, items_snapshot").eq("organization_id", organizationId).in("id", currentRevisionIds)
    : { data: [], error: null };
  if (revisionError) throw new Error("Az anyaglisták tételei nem tölthetők be.");
  const itemCount = new Map((revisions ?? []).map((row) => [row.id, Array.isArray(row.items_snapshot) ? row.items_snapshot.length : 0]));
  const sourceVersion = new Map(sources.map((source) => [source.material_revision_id, source.survey_version]));
  const quotations = await getQuotationsForMaterialLists(organizationId, listIds);
  return (lists ?? []).filter((list) => list.project_id === null).map((list) => ({
    listId: list.id, name: list.name, version: list.version, updatedAt: list.updated_at,
    itemCount: list.current_revision_id ? itemCount.get(list.current_revision_id) ?? 0 : 0,
    surveyVersion: (list.current_revision_id ? sourceVersion.get(list.current_revision_id) : undefined)
      ?? Math.min(...sources.filter((source) => source.material_list_id === list.id).map((source) => source.survey_version)),
    quotations: quotations.get(list.id) ?? [],
  }));
}
