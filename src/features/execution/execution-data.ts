/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase additions await generated database type refresh. */
import { createClient } from "@/infrastructure/supabase/server";

export type ExecutionTaskRecord = { id: string; title: string; description: string | null; status: "todo" | "in_progress" | "done"; priority: "low" | "normal" | "high"; dueDate: string | null; sortOrder: number; version: number };
export type ExecutionPlanRecord = { id: string; title: string; description: string | null; version: number; createdAt: string; updatedAt: string; sourceQuotationId: string | null; sourceRevisionId: string | null; sourceQuotationName: string | null; sourceSubtotal: string | null; tasks: ExecutionTaskRecord[] };
export type AcceptedQuotationOption = { id: string; name: string; finalizedRevisionId: string; subtotal: string | null };
type LooseClient = { from: (table: string) => any };

export async function getExecutionPlanningWorkspace(organizationId: string, projectId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as LooseClient;
  const [plansResponse, tasksResponse, quotesResponse] = await Promise.all([
    db.from("execution_plans").select("id, title, description, version, created_at, updated_at, source_quotation_id, source_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false }),
    db.from("execution_tasks").select("id, plan_id, title, description, status, priority, due_date, sort_order, version").eq("organization_id", organizationId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    db.from("quotations").select("id, name, finalized_revision_id, status").eq("organization_id", organizationId).eq("project_id", projectId).eq("status", "accepted").not("finalized_revision_id", "is", null).order("updated_at", { ascending: false }),
  ]);
  if (plansResponse.error || tasksResponse.error || quotesResponse.error) throw new Error("A kivitelezési tervek betöltése nem sikerült.");
  const plans = plansResponse.data ?? [];
  const tasks = tasksResponse.data ?? [];
  const quotes = quotesResponse.data ?? [];
  const sourceIds = plans.flatMap((p: any) => p.source_quotation_id ? [p.source_quotation_id] : []);
  const { data: sourceQuotes } = sourceIds.length ? await db.from("quotations").select("id, name, finalized_revision_id").in("id", sourceIds).eq("organization_id", organizationId) : { data: [] };
  const revisionIds = plans.flatMap((p: any) => p.source_revision_id ? [p.source_revision_id] : []);
  const { data: revisions } = revisionIds.length ? await db.from("quotation_revisions").select("id, subtotal").in("id", revisionIds).eq("organization_id", organizationId) : { data: [] };
  const quoteMap = new Map<string, any>((sourceQuotes ?? []).map((q: any) => [q.id, q] as [string, any]));
  const revisionMap = new Map<string, any>((revisions ?? []).map((r: any) => [r.id, r] as [string, any]));
  return {
    plans: plans.map((plan: any): ExecutionPlanRecord => ({ id: plan.id, title: plan.title, description: plan.description, version: plan.version, createdAt: plan.created_at, updatedAt: plan.updated_at, sourceQuotationId: plan.source_quotation_id, sourceRevisionId: plan.source_revision_id, sourceQuotationName: quoteMap.get(plan.source_quotation_id)?.name ?? null, sourceSubtotal: revisionMap.get(plan.source_revision_id)?.subtotal ?? null, tasks: tasks.filter((task: any) => task.plan_id === plan.id).map((task: any) => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.due_date, sortOrder: task.sort_order, version: task.version })) })),
    acceptedQuotations: quotes.map((q: any): AcceptedQuotationOption => ({ id: q.id, name: q.name, finalizedRevisionId: q.finalized_revision_id, subtotal: null })),
  };
}
