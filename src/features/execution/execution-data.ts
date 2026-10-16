/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase additions await generated database type refresh. */
import { createClient } from "@/infrastructure/supabase/server";
import type { ExecutionPhotoCategory } from "@/domain/execution/contracts";
import { summarizeExecutionIndexTasks } from "./execution-overview-index";

export type ExecutionTaskRecord = { id: string; title: string; description: string | null; status: "todo" | "in_progress" | "done"; priority: "low" | "normal" | "high"; dueDate: string | null; sortOrder: number; version: number };
export type ExecutionPhotoRecord = { id: string; taskId: string | null; taskTitle: string | null; journalEntryId: string | null; journalDate: string | null; journalContent: string | null; objectKey: string; displayFilename: string; mimeType: string; fileSize: number; caption: string | null; category: ExecutionPhotoCategory; uploadedAt: string; uploaderName: string | null; signedUrl: string | null };
export type ExecutionPlanRecord = { id: string; title: string; description: string | null; version: number; createdAt: string; updatedAt: string; sourceQuotationId: string | null; sourceRevisionId: string | null; sourceRevisionNumber: number | null; sourceQuotationName: string | null; sourceQuotationStatus: string | null; sourceSubtotal: string | null; tasks: ExecutionTaskRecord[]; photos: ExecutionPhotoRecord[] };
export type AcceptedQuotationOption = { id: string; name: string; finalizedRevisionId: string; subtotal: string | null };
export type ExecutionTimelineItem = { id: string; type: "journal" | "task_event"; date: string; recordedAt: string; authorAvailable: boolean; taskTitle: string | null; category?: "general" | "work_done" | "problem" | "next_step"; content?: string; problems?: string | null; nextSteps?: string | null; fromStatus?: "todo" | "in_progress" | "done"; toStatus?: "todo" | "in_progress" | "done" };
type LooseClient = { from: (table: string) => any };

export async function getExecutionOverviewForOrganization(organizationId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as LooseClient;
  const plansResponse = await db.from("execution_plans").select("id, project_id, title, updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(200);
  if (plansResponse.error) throw new Error("A kivitelezési áttekintő betöltése nem sikerült.");
  const plans = plansResponse.data ?? [];
  const planIds = plans.map((plan: any) => plan.id);
  if (!planIds.length) return [];
  const [tasksResponse, journalResponse, photosResponse] = await Promise.all([
    db.from("execution_tasks").select("id, plan_id, title, status, due_date").eq("organization_id", organizationId).in("plan_id", planIds).order("sort_order", { ascending: true }),
    db.from("execution_journal_entries").select("id, plan_id").eq("organization_id", organizationId).in("plan_id", planIds),
    db.from("execution_photos").select("id, plan_id").eq("organization_id", organizationId).in("plan_id", planIds),
  ]);
  if (tasksResponse.error || journalResponse.error || photosResponse.error) throw new Error("A kivitelezési feladatok áttekintése nem tölthető be.");
  const tasks = tasksResponse.data ?? [];
  const journal = journalResponse.data ?? [];
  const photos = photosResponse.data ?? [];
  return plans.map((plan: any) => {
    const planTasks = tasks.filter((task: any) => task.plan_id === plan.id).map((task: any) => ({ id: task.id, title: task.title, status: task.status, dueDate: task.due_date }));
    return {
      id: plan.id, projectId: plan.project_id, title: plan.title, updatedAt: plan.updated_at,
      tasks: summarizeExecutionIndexTasks(planTasks),
      journalCount: journal.filter((entry: any) => entry.plan_id === plan.id).length,
      photoCount: photos.filter((photo: any) => photo.plan_id === plan.id).length,
    };
  });
}

export async function getExecutionPlanningWorkspace(organizationId: string, projectId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as LooseClient;
  const [plansResponse, tasksResponse, quotesResponse, journalResponse, eventResponse, photosResponse] = await Promise.all([
    db.from("execution_plans").select("id, title, description, version, created_at, updated_at, source_quotation_id, source_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false }),
    db.from("execution_tasks").select("id, plan_id, title, description, status, priority, due_date, sort_order, version").eq("organization_id", organizationId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    db.from("quotations").select("id, name, finalized_revision_id, status").eq("organization_id", organizationId).eq("project_id", projectId).eq("status", "accepted").not("finalized_revision_id", "is", null).order("updated_at", { ascending: false }),
    db.from("execution_journal_entries").select("id, plan_id, task_id, work_date, category, content, problems, next_steps, created_by, created_at").eq("organization_id", organizationId).order("work_date", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    db.from("execution_task_events").select("id, plan_id, task_id, from_status, to_status, changed_by, changed_at").eq("organization_id", organizationId).order("changed_at", { ascending: false }).order("id", { ascending: false }).limit(100),
    db.from("execution_photos").select("id, project_id, plan_id, task_id, journal_entry_id, object_key, display_filename, mime_type, file_size, caption, category, uploaded_by, uploaded_at").eq("organization_id", organizationId).eq("project_id", projectId).order("uploaded_at", { ascending: false }).order("id", { ascending: false }).limit(100),
  ]);
  if (plansResponse.error || tasksResponse.error || quotesResponse.error || journalResponse.error || eventResponse.error || photosResponse.error) throw new Error("A kivitelezési tervek betöltése nem sikerült.");
  const plans = plansResponse.data ?? [];
  const tasks = tasksResponse.data ?? [];
  const quotes = quotesResponse.data ?? [];
  const journal = journalResponse.data ?? [];
  const events = eventResponse.data ?? [];
  const photos = photosResponse.data ?? [];
  const uploaderIds = [...new Set(photos.map((photo: any) => photo.uploaded_by).filter(Boolean))];
  const { data: uploaders } = uploaderIds.length ? await db.from("profiles").select("id, display_name").in("id", uploaderIds) : { data: [] };
  const uploaderMap = new Map<string, string | null>((uploaders ?? []).map((profile: any) => [profile.id, profile.display_name]));
  const signedPhotos = await Promise.all(photos.map(async (photo: any) => {
    const { data } = await supabase.storage.from("execution-photos").createSignedUrl(photo.object_key, 300);
    return [photo.id, data?.signedUrl ?? null] as const;
  }));
  const signedPhotoMap = new Map(signedPhotos);
  const sourceIds = plans.flatMap((p: any) => p.source_quotation_id ? [p.source_quotation_id] : []);
  const { data: sourceQuotes } = sourceIds.length ? await db.from("quotations").select("id, name, finalized_revision_id, status").in("id", sourceIds).eq("organization_id", organizationId) : { data: [] };
  const revisionIds = plans.flatMap((p: any) => p.source_revision_id ? [p.source_revision_id] : []);
  const { data: revisions } = revisionIds.length ? await db.from("quotation_revisions").select("id, revision_number, subtotal").in("id", revisionIds).eq("organization_id", organizationId) : { data: [] };
  const quoteMap = new Map<string, any>((sourceQuotes ?? []).map((q: any) => [q.id, q] as [string, any]));
  const revisionMap = new Map<string, any>((revisions ?? []).map((r: any) => [r.id, r] as [string, any]));
  return {
    plans: plans.map((plan: any): ExecutionPlanRecord => ({
      id: plan.id, title: plan.title, description: plan.description, version: plan.version, createdAt: plan.created_at, updatedAt: plan.updated_at,
      sourceQuotationId: plan.source_quotation_id, sourceRevisionId: plan.source_revision_id, sourceRevisionNumber: revisionMap.get(plan.source_revision_id)?.revision_number == null ? null : Number(revisionMap.get(plan.source_revision_id)?.revision_number), sourceQuotationName: quoteMap.get(plan.source_quotation_id)?.name ?? null, sourceQuotationStatus: quoteMap.get(plan.source_quotation_id)?.status ?? null, sourceSubtotal: revisionMap.get(plan.source_revision_id)?.subtotal ?? null,
      tasks: tasks.filter((task: any) => task.plan_id === plan.id).map((task: any) => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.due_date, sortOrder: task.sort_order, version: task.version })),
      photos: photos.filter((photo: any) => photo.plan_id === plan.id).map((photo: any) => {
        const journalEntry = journal.find((entry: any) => entry.id === photo.journal_entry_id);
        const task = tasks.find((entry: any) => entry.id === photo.task_id);
        return { id: photo.id, taskId: photo.task_id, taskTitle: task?.title ?? null, journalEntryId: photo.journal_entry_id, journalDate: journalEntry?.work_date ?? null, journalContent: journalEntry?.content ?? null, objectKey: photo.object_key, displayFilename: photo.display_filename, mimeType: photo.mime_type, fileSize: Number(photo.file_size), caption: photo.caption, category: photo.category, uploadedAt: photo.uploaded_at, uploaderName: uploaderMap.get(photo.uploaded_by) ?? null, signedUrl: signedPhotoMap.get(photo.id) ?? null };
      }),
    })),
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
