import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";
import type { MaterialPreparationItem, PreparationSourceSnapshot } from "@/domain/material-preparations/contracts";

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
}>;

export type MaterialPreparationList = Readonly<{
  id: string;
  projectId: string;
  name: string;
  version: number;
  updatedAt: string;
  currentRevisionId: string | null;
  currentRevision: MaterialPreparationRevision | null;
  history: readonly MaterialPreparationRevision[];
}>;

const jsonArray = <T,>(value: Json): T[] => Array.isArray(value) ? value as T[] : [];

export async function getMaterialPreparationLists(organizationId: string, projectId: string, currentSourceRevisions: ReadonlyMap<string, string | null>): Promise<MaterialPreparationList[]> {
  const supabase = await createClient();
  const { data: lists, error: listError } = await supabase.from("material_preparation_lists")
    .select("id, organization_id, project_id, name, current_revision_id, version, updated_at")
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
    };
  };
  const revisionRows = (revisions ?? []) as PreparationRevisionRow[];
  return lists.map((list) => {
    const history = revisionRows.filter((revision) => revision.list_id === list.id).map(mapRevision);
    return {
      id: list.id,
      projectId: list.project_id,
      name: list.name,
      version: list.version,
      updatedAt: list.updated_at,
      currentRevisionId: list.current_revision_id,
      currentRevision: history.find((revision) => revision.id === list.current_revision_id) ?? null,
      history,
    };
  });
}
