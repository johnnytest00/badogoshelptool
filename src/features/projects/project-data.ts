import { createClient } from "@/infrastructure/supabase/server";
import type { Database } from "@/infrastructure/supabase/database.types";
import { projectFilterSchema, type ProjectStatus, type ProjectType } from "@/domain/projects/contracts";

export type ProjectRecord = {
  id: string;
  organizationId: string;
  clientId: string | null;
  clientName: string | null;
  name: string;
  description: string | null;
  location: string | null;
  projectType: ProjectType;
  status: ProjectStatus;
  previousStatus: ProjectStatus | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

function mapProject(row: ProjectRow, clients: Map<string, ClientRow>): ProjectRecord {
  const client = row.client_id ? clients.get(row.client_id) : undefined;
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    clientName: client?.name ?? null,
    name: row.name,
    description: row.description,
    location: row.location,
    projectType: row.project_type,
    status: row.status,
    previousStatus: row.previous_status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProjectsForOrganization(organizationId: string, rawFilters: unknown = {}) {
  const filters = projectFilterSchema.parse(rawFilters);
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("id, organization_id, client_id, name, description, location, project_type, status, previous_status, version, created_at, updated_at, created_by")
    .eq("organization_id", organizationId)
    .not("name", "ilike", "DEMO%")
    .order("updated_at", { ascending: filters.sort === "oldest" })
    .limit(100);

  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.projectType) query = query.eq("project_type", filters.projectType);
  if (!filters.includeArchived && !filters.status) query = query.neq("status", "archived");

  const { data, error } = await query;
  if (error) throw new Error("A projektek betöltése nem sikerült.");

  const rows = data ?? [];
  const clientIds = rows.flatMap((project) => (project.client_id ? [project.client_id] : []));
  const { data: clients, error: clientError } = clientIds.length
    ? await supabase.from("clients").select("id, organization_id, name, email, phone, billing_address, notes, created_at, updated_at").in("id", clientIds).eq("organization_id", organizationId)
    : { data: [], error: null };
  if (clientError) throw new Error("Az ügyféladatok betöltése nem sikerült.");

  return rows.map((row) => mapProject(row, new Map((clients ?? []).map((client) => [client.id, client]))));
}

export async function getProjectForOrganization(organizationId: string, projectId: string) {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("projects")
    .select("id, organization_id, client_id, name, description, location, project_type, status, previous_status, version, created_at, updated_at, created_by")
    .eq("id", projectId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error("A projekt betöltése nem sikerült.");
  if (!row) return null;

  const client = row.client_id
    ? await supabase.from("clients").select("id, organization_id, name, email, phone, billing_address, notes, created_at, updated_at").eq("id", row.client_id).eq("organization_id", organizationId).maybeSingle()
    : { data: null, error: null };
  if (client.error) throw new Error("Az ügyféladatok betöltése nem sikerült.");
  return mapProject(row, client.data ? new Map([[client.data.id, client.data]]) : new Map());
}

export async function getClientsForOrganization(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, organization_id, name, email, phone, billing_address, notes, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .limit(100);
  if (error) throw new Error("Az ügyfelek betöltése nem sikerült.");
  return data ?? [];
}
