"use server";
/* eslint-disable @typescript-eslint/no-explicit-any -- RPC return shape is generated after migration deployment. */
import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { executionPlanSchema, executionTaskSchema } from "@/domain/execution/contracts";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
type Rpc = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: { code?: string; message?: string } | null }> };
function errorMessage(error: { code?: string; message?: string } | null, fallback: string) { return error?.code === "40001" || error?.message?.includes("stale") ? "Az adat időközben megváltozott; töltsd újra az oldalt." : error?.message ?? fallback; }
async function access(organizationId: string) { const auth = await getAuthContext(); return auth?.organizations.some((org) => org.id === organizationId) ? auth : null; }

export async function createExecutionPlanAction(data: FormData) {
  const organizationId = text(data, "organizationId"), projectId = text(data, "projectId");
  if (!await access(organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  const parsed = executionPlanSchema.safeParse({ title: text(data, "title"), description: text(data, "description") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd a terv adatait." };
  const db = await createClient() as unknown as Rpc;
  const { data: result, error } = await db.rpc("create_execution_plan", { p_organization_id: organizationId, p_project_id: projectId, p_title: parsed.data.title, p_description: parsed.data.description || null, p_source_quotation_id: text(data, "sourceQuotationId") || null, p_source_revision_id: text(data, "sourceRevisionId") || null, p_request_key: text(data, "requestKey") || crypto.randomUUID() });
  if (error || !result?.[0]) return { ok: false, error: errorMessage(error, "A terv létrehozása nem sikerült.") };
  revalidatePath(`/projektek/${projectId}`); return { ok: true, planId: result[0].plan_id };
}

export async function saveExecutionTaskAction(data: FormData) {
  const organizationId = text(data, "organizationId"), projectId = text(data, "projectId"), planId = text(data, "planId");
  if (!await access(organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  const parsed = executionTaskSchema.safeParse({ title: text(data, "title"), description: text(data, "description"), status: text(data, "status") || "todo", priority: text(data, "priority") || "normal", dueDate: text(data, "dueDate"), sortOrder: text(data, "sortOrder") || "0", version: text(data, "version") || "0" });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd a feladat adatait." };
  const db = await createClient() as unknown as Rpc;
  const { data: result, error } = await db.rpc("save_execution_task", { p_organization_id: organizationId, p_plan_id: planId, p_task_id: text(data, "taskId") || null, p_title: parsed.data.title, p_description: parsed.data.description || null, p_status: parsed.data.status, p_priority: parsed.data.priority, p_due_date: parsed.data.dueDate || null, p_sort_order: parsed.data.sortOrder, p_expected_version: parsed.data.version, p_request_key: text(data, "requestKey") || crypto.randomUUID() });
  if (error || !result?.[0]) return { ok: false, error: errorMessage(error, "A feladat mentése nem sikerült.") };
  revalidatePath(`/projektek/${projectId}`); return { ok: true, taskId: result[0].task_id };
}
