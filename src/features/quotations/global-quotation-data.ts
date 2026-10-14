import { createClient } from "@/infrastructure/supabase/server";
import { getProjectsForOrganization } from "@/features/projects/project-data";

export async function getGlobalProjectQuotations(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotations")
    .select("id, name, client_id, project_id, current_revision_id, version, status, created_at, updated_at")
    .eq("organization_id", organizationId).eq("ownership_scope" as never, "project" as never)
    .order("updated_at", { ascending: false }).limit(101);
  if (error) throw new Error("A projektajánlatok listája nem tölthető be.");
  const rows = data ?? [];
  const visibleRows = rows.slice(0, 100);
  const [projects, clientsResult, revisionsResult] = await Promise.all([
    getProjectsForOrganization(organizationId, { includeArchived: true, sort: "newest" }),
    visibleRows.some((row) => row.client_id)
      ? supabase.from("clients").select("id, name").eq("organization_id", organizationId).in("id", visibleRows.flatMap((row) => row.client_id ? [row.client_id] : []))
      : Promise.resolve({ data: [], error: null }),
    visibleRows.some((row) => row.current_revision_id)
      ? supabase.from("quotation_revisions").select("id, subtotal").eq("organization_id", organizationId).in("id", visibleRows.flatMap((row) => row.current_revision_id ? [row.current_revision_id] : []))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (clientsResult.error || revisionsResult.error) throw new Error("Az ajánlati részletek nem tölthetők be.");
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const clientNames = new Map((clientsResult.data ?? []).map((client) => [client.id, client.name]));
  const totals = new Map((revisionsResult.data ?? []).map((revision) => [revision.id, revision.subtotal === null ? null : String(revision.subtotal)]));
  return {
    items: visibleRows.map((row) => ({
      id: row.id, name: row.name, projectId: row.project_id, projectName: projectNames.get(row.project_id) ?? "Projekt",
      clientName: row.client_id ? clientNames.get(row.client_id) ?? null : null, version: row.version,
      status: row.status, updatedAt: row.updated_at,
      subtotal: row.current_revision_id ? totals.get(row.current_revision_id) ?? null : null,
    })),
    hasMore: rows.length > 100,
  };
}
