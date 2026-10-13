/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase additions await generated database type refresh. */
import { createClient } from "@/infrastructure/supabase/server";

export type ExecutionTaskRecord = { id: string; title: string; description: string | null; status: "todo" | "in_progress" | "done"; priority: "low" | "normal" | "high"; dueDate: string | null; sortOrder: number; version: number };
export type ExecutionPlanRecord = { id: string; title: string; description: string | null; version: number; createdAt: string; updatedAt: string; sourceQuotationId: string | null; sourceRevisionId: string | null; sourceQuotationName: string | null; sourceSubtotal: string | null; tasks: ExecutionTaskRecord[] };
export type AcceptedQuotationOption = { id: string; name: string; finalizedRevisionId: string; subtotal: string | null };
export type ExecutionTimelineItem = { id: string; type: "journal" | "task_event"; date: string; recordedAt: string; authorAvailable: boolean; taskTitle: string | null; category?: "general" | "work_done" | "problem" | "next_step"; content?: string; problems?: string | null; nextSteps?: string | null; fromStatus?: "todo" | "in_progress" | "done"; toStatus?: "todo" | "in_progress" | "done" };
type LooseClient = { from: (table: string) => any };

export async function getExecutionPlanningWorkspace(organizationId: string, projectId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as LooseClient;
  const [plansResponse, tasksResponse, quotesResponse, journalResponse, eventResponse] = await Promise.all([
    db.from("execution_plans").select("id, title, description, version, created_at, updated_at, source_quotation_id, source_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false }),
    db.from("execution_tasks").select("id, plan_id, title, description, status, priority, due_date, sort_order, version").eq("organization_id", organizationId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    db.from("quotations").select("id, name, finalized_revision_id, status").eq("organization_id", organizationId).eq("project_id", projectId).eq("status", "accepted").not("finalized_revision_id", "is", null).order("updated_at", { ascending: false }),
    db.from("execution_journal_entries").select("id, plan_id, task_id, work_date, category, content, problems, next_steps, created_by, created_at").eq("organization_id", organizationId).order("work_date", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    db.from("execution_task_events").select("id, plan_id, task_id, from_status, to_status, changed_by, changed_at").eq("organization_id", organizationId).order("changed_at", { ascending: false }).order("id", { ascending: false }).limit(100),
  ]);
  if (plansResponse.error || tasksResponse.error || quotesResponse.error || journalResponse.error || eventResponse.error) throw new Error("A kivitelezési tervek betöltése nem sikerült.");
  const plans = plansResponse.data ?? [];
  const tasks = tasksResponse.data ?? [];
  const quotes = quotesResponse.data ?? [];
  const journal = journalResponse.data ?? [];
  const events = eventResponse.data ?? [];
  const sourceIds = plans.flatMap((p: any) => p.source_quotation_id ? [p.source_quotation_id] : []);
  const { data: sourceQuotes } = sourceIds.length ? await db.from("quotations").select("id, name, finalized_revision_id").in("id", sourceIds).eq("organization_id", organizationId) : { data: [] };
  const revisionIds = plans.flatMap((p: any) => p.source_revision_id ? [p.source_revision_id] : []);
  const { data: revisions } = revisionIds.length ? await db.from("quotation_revisions").select("id, subtotal").in("id", revisionIds).eq("organization_id", organizationId) : { data: [] };
  const quoteMap = new Map<string, any>((sourceQuotes ?? []).map((q: any) => [q.id, q] as [string, any]));
  const revisionMap = new Map<string, any>((revisions ?? []).map((r: any) => [r.id, r] as [string, any]));
  return {
    plans: plans.map((plan: any): ExecutionPlanRecord => ({ id: plan.id, title: plan.title, description: plan.description, version: plan.version, createdAt: plan.created_at, updatedAt: plan.updated_at, sourceQuotationId: plan.source_quotation_id, sourceRevisionId: plan.source_revision_id, sourceQuotationName: quoteMap.get(plan.source_quotation_id)?.name ?? null, sourceSubtotal: revisionMap.get(plan.source_revision_id)?.subtotal ?? null, tasks: tasks.filter((task: any) => task.plan_id === plan.id).map((task: any) => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.due_date, sortOrder: task.sort_order, version: task.version })) })),
    acceptedQuotations: quotes.map((q: any): AcceptedQuotationOption => ({ id: q.id, name: q.name, finalizedRevisionId: q.finalized_revision_id, subtotal: null })),
    timelineByPlan: new Map<string, ExecutionTimelineItem[]>(plans.map((plan: any) => {
      const taskTitle = (taskId: string | null) => tasks.find((task: any) => task.id === taskId)?.title ?? null;
      const items: ExecutionTimelineItem[] = [
        ...journal.filter((entry: any) => entry.plan_id === plan.id).map((entry: any) => ({ id: entry.id, type: "journal" as const, date: entry.work_date, recordedAt: entry.created_at, authorAvailable: Boolean(entry.created_by), taskTitle: taskTitle(entry.task_id), category: entry.category, content: entry.content, problems: entry.problems, nextSteps: entry.next_steps })),
        ...events.filter((event: any) => event.plan_id === plan.id).map((event: any) => ({ id: event.id, type: "task_event" as const, date: String(event.changed_at).slice(0, 10), recordedAt: event.changed_at, authorAvailable: Boolean(event.changed_by), taskTitle: taskTitle(event.task_id), fromStatus: event.from_status, toStatus: event.to_status })),
      ];
      items.sort((first, second) => `${second.date}|${second.recordedAt}|${second.id}`.localeCompare(`${first.date}|${first.recordedAt}|${first.id}`));
      return [plan.id, items] as [string, ExecutionTimelineItem[]];
    })),
  };
}
