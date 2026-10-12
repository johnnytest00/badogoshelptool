"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { clientInputSchema, projectInputSchema, type ProjectStatus } from "@/domain/projects/contracts";

export type ProjectActionResult = {
  ok: boolean;
  error?: string;
  projectId?: string;
  fieldErrors?: Record<string, string>;
};

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function authorizeOrganization(organizationId: string) {
  const auth = await getAuthContext();
  if (!auth) return { error: "A munkamenet lejárt. Jelentkezz be újra." } as const;
  const organization = auth.organizations.find((item) => item.id === organizationId);
  if (!organization) return { error: "Ehhez a műhelyhez nincs hozzáférésed." } as const;
  return { auth, organization } as const;
}

function validationError(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): ProjectActionResult {
  const fieldErrors = Object.fromEntries(Object.entries(error.flatten().fieldErrors).flatMap(([key, value]) => value?.[0] ? [[key, value[0]]] : []));
  return { ok: false, error: "Ellenőrizd a megjelölt mezőket.", fieldErrors };
}

function refreshProjectPaths(projectId?: string) {
  revalidatePath("/");
  revalidatePath("/projektek");
  if (projectId) revalidatePath(`/projektek/${projectId}`);
}

export async function createClientAction(formData: FormData): Promise<ProjectActionResult> {
  const organizationId = text(formData, "organizationId");
  const access = await authorizeOrganization(organizationId);
  if ("error" in access) return { ok: false, error: access.error };
  const parsed = clientInputSchema.safeParse({
    name: text(formData, "name"), email: text(formData, "email"), phone: text(formData, "phone"),
    billingAddress: text(formData, "billingAddress"), notes: text(formData, "notes"),
  });
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    billing_address: parsed.data.billingAddress || null,
    notes: parsed.data.notes || null,
  }).select("id").single();
  if (error || !data) return { ok: false, error: "Az ügyfél mentése nem sikerült." };
  refreshProjectPaths();
  return { ok: true, projectId: data.id };
}

export async function updateClientAction(formData: FormData): Promise<ProjectActionResult> {
  const id = text(formData, "clientId");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Érvénytelen ügyfélazonosító." };
  const organizationId = text(formData, "organizationId");
  const access = await authorizeOrganization(organizationId);
  if ("error" in access) return { ok: false, error: access.error };
  const parsed = clientInputSchema.safeParse({
    name: text(formData, "name"), email: text(formData, "email"), phone: text(formData, "phone"),
    billingAddress: text(formData, "billingAddress"), notes: text(formData, "notes"),
  });
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").update({
    name: parsed.data.name, email: parsed.data.email || null, phone: parsed.data.phone || null,
    billing_address: parsed.data.billingAddress || null, notes: parsed.data.notes || null,
  }).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "Az ügyfél nem található vagy nem módosítható." };
  refreshProjectPaths();
  return { ok: true };
}

export async function createProjectAction(formData: FormData): Promise<ProjectActionResult> {
  const organizationId = text(formData, "organizationId");
  const access = await authorizeOrganization(organizationId);
  if ("error" in access) return { ok: false, error: access.error };
  const parsed = projectInputSchema.safeParse({
    name: text(formData, "name"), projectType: text(formData, "projectType"),
    description: text(formData, "description"), location: text(formData, "location"), clientId: text(formData, "clientId"),
  });
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").insert({
    organization_id: organizationId, client_id: parsed.data.clientId || null, name: parsed.data.name,
    description: parsed.data.description || null, location: parsed.data.location || null,
    project_type: parsed.data.projectType, created_by: access.auth.userId,
  }).select("id").single();
  if (error || !data) return { ok: false, error: "A projekt mentése nem sikerült. Ellenőrizd az ügyfél-hozzárendelést." };
  refreshProjectPaths(data.id);
  return { ok: true, projectId: data.id };
}

export async function updateProjectAction(formData: FormData): Promise<ProjectActionResult> {
  const id = text(formData, "projectId");
  const organizationId = text(formData, "organizationId");
  const expectedVersion = Number(text(formData, "version"));
  const access = await authorizeOrganization(organizationId);
  if ("error" in access) return { ok: false, error: access.error };
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) return { ok: false, error: "Érvénytelen projektverzió." };
  const parsed = projectInputSchema.safeParse({
    name: text(formData, "name"), projectType: text(formData, "projectType"),
    description: text(formData, "description"), location: text(formData, "location"), clientId: text(formData, "clientId"),
  });
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase.from("projects").select("status").eq("id", id).eq("organization_id", organizationId).eq("version", expectedVersion).maybeSingle();
  if (currentError || !current) return { ok: false, error: "A projekt közben megváltozott. Töltsd újra az aktuális adatokat." };
  const { data, error } = await supabase.from("projects").update({
    client_id: parsed.data.clientId || null, name: parsed.data.name, description: parsed.data.description || null,
    location: parsed.data.location || null, project_type: parsed.data.projectType,
    version: expectedVersion + 1,
  }).eq("id", id).eq("organization_id", organizationId).eq("version", expectedVersion).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "A projekt közben megváltozott. Töltsd újra az aktuális adatokat." };
  refreshProjectPaths(id);
  return { ok: true, projectId: id };
}

export async function archiveProjectAction(formData: FormData): Promise<ProjectActionResult> {
  return updateProjectLifecycle(formData, "archive");
}

export async function restoreProjectAction(formData: FormData): Promise<ProjectActionResult> {
  return updateProjectLifecycle(formData, "restore");
}

async function updateProjectLifecycle(formData: FormData, operation: "archive" | "restore"): Promise<ProjectActionResult> {
  const id = text(formData, "projectId");
  const organizationId = text(formData, "organizationId");
  const expectedVersion = Number(text(formData, "version"));
  const access = await authorizeOrganization(organizationId);
  if ("error" in access) return { ok: false, error: access.error };
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) return { ok: false, error: "Érvénytelen projektverzió." };
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase.from("projects").select("status, previous_status").eq("id", id).eq("organization_id", organizationId).eq("version", expectedVersion).maybeSingle();
  if (currentError || !current) return { ok: false, error: "A projekt közben megváltozott. Töltsd újra az aktuális adatokat." };
  if (operation === "archive" && current.status === "archived") return { ok: false, error: "A projekt már archiválva van." };
  if (operation === "restore" && (current.status !== "archived" || !current.previous_status)) return { ok: false, error: "Az archivált projekt korábbi állapota nem ismert." };
  const update = operation === "restore"
    ? { status: current.previous_status as ProjectStatus, previous_status: null, version: expectedVersion + 1 }
    : { status: "archived" as const, previous_status: current.status, version: expectedVersion + 1 };
  const { data, error } = await supabase.from("projects").update(update).eq("id", id).eq("organization_id", organizationId).eq("version", expectedVersion).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "A projekt közben megváltozott. Töltsd újra az aktuális adatokat." };
  refreshProjectPaths(id);
  return { ok: true, projectId: id };
}

export async function duplicateProjectAction(formData: FormData): Promise<ProjectActionResult> {
  const id = text(formData, "projectId");
  const organizationId = text(formData, "organizationId");
  const access = await authorizeOrganization(organizationId);
  if ("error" in access) return { ok: false, error: access.error };
  const supabase = await createClient();
  const { data: source, error: sourceError } = await supabase.from("projects").select("name, description, location, project_type, client_id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (sourceError || !source) return { ok: false, error: "A projekt nem található." };
  const { data, error } = await supabase.from("projects").insert({
    organization_id: organizationId, client_id: source.client_id, name: `${source.name} — másolat`.slice(0, 200),
    description: source.description, location: source.location, project_type: source.project_type,
    status: "draft", created_by: access.auth.userId,
  }).select("id").single();
  if (error || !data) return { ok: false, error: "A projekt másolása nem sikerült." };
  refreshProjectPaths(data.id);
  return { ok: true, projectId: data.id };
}
