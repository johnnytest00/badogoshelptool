/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase additions await generated database type refresh. */
import { createClient } from "@/infrastructure/supabase/server";
import type { ExecutionPhotoCategory } from "@/domain/execution/contracts";
import { summarizeExecutionIndexTasks } from "./execution-overview-index";

export type ExecutionTaskRecord = { id: string; title: string; description: string | null; status: "todo" | "in_progress" | "done"; priority: "low" | "normal" | "high"; dueDate: string | null; sortOrder: number; version: number };
export type ExecutionPhotoRecord = { id: string; taskId: string | null; taskTitle: string | null; journalEntryId: string | null; journalDate: string | null; journalContent: string | null; objectKey: string; displayFilename: string; mimeType: string; fileSize: number; caption: string | null; category: ExecutionPhotoCategory; uploadedAt: string; uploaderName: string | null; signedUrl: string | null };
export type ExecutionPlanRecord = { id: string; projectId: string | null; title: string; description: string | null; version: number; createdAt: string; updatedAt: string; sourceQuotationId: string | null; sourceRevisionId: string | null; sourceRevisionNumber: number | null; sourceQuotationName: string | null; sourceQuotationStatus: string | null; sourceSubtotal: string | null; tasks: ExecutionTaskRecord[]; photos: ExecutionPhotoRecord[] };
export type ExecutionPlanOption = { id: string; title: string; projectId: string | null; updatedAt: string };
export type ExecutionLinkedSurveyPhoto = { id: string; displayFilename: string; description: string | null; signedUrl: string | null };
export type ExecutionLinkedSurvey = { id: string; surveyId: string; surveyVersion: number; currentVersion: number; revisionId: string; sections: import("@/domain/field-surveys/workspace").SurveySection[]; notes: string | null; photos: ExecutionLinkedSurveyPhoto[] };
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

export async function getExecutionPlanOptionsForOrganization(organizationId: string): Promise<ExecutionPlanOption[]> {
  const supabase = await createClient();
  const db = supabase as unknown as LooseClient;
  const { data, error } = await db.from("execution_plans").select("id,title,project_id,updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(200);
  if (error) throw new Error("A munkanapló-választó betöltése nem sikerült.");
  return (data ?? []).map((plan: any) => ({ id: plan.id, title: plan.title, projectId: plan.project_id, updatedAt: plan.updated_at }));
}

export async function getExecutionPlanForOrganization(organizationId: string, planId: string): Promise<ExecutionPlanOption | null> {
  const supabase = await createClient();
  const db = supabase as unknown as LooseClient;
  const { data, error } = await db.from("execution_plans").select("id,title,project_id,updated_at").eq("organization_id", organizationId).eq("id", planId).maybeSingle();
  if (error) throw new Error("A munkanapló betöltése nem sikerült.");
  return data ? { id: data.id, title: data.title, projectId: data.project_id, updatedAt: data.updated_at } : null;
}

export async function getExecutionPlanLinkedSurveys(organizationId: string, planId: string): Promise<ExecutionLinkedSurvey[]> {
  const supabase = await createClient();
  const db = supabase as unknown as LooseClient;
  const { data: links, error: linksError } = await db.from("field_survey_execution_plan_links")
    .select("id,survey_id,survey_revision_id,created_at")
    .eq("organization_id", organizationId).eq("execution_plan_id", planId).order("created_at", { ascending: false });
  if (linksError) throw new Error("A munkanaplóhoz kapcsolt felmérések nem tölthetők be.");
  if (!links?.length) return [];
  const surveyIds = [...new Set(links.map((link: any) => link.survey_id))];
  const revisionIds = [...new Set(links.map((link: any) => link.survey_revision_id))];
  const [revisionsResponse, surveysResponse] = await Promise.all([
    db.from("field_survey_revisions").select("id,survey_id,version,work_type,sections,measurements,notes,photos_snapshot").eq("organization_id", organizationId).in("id", revisionIds),
    db.from("field_surveys").select("id,version").eq("organization_id", organizationId).in("id", surveyIds),
  ]);
  if (revisionsResponse.error || surveysResponse.error) throw new Error("A felmérés pontos forrásváltozata nem tölthető be.");
  const revisions = revisionsResponse.data ?? [];
  const surveys = surveysResponse.data ?? [];
  const photoSnapshots = revisions.flatMap((revision: any) => Array.isArray(revision.photos_snapshot) ? revision.photos_snapshot : []);
  const signedPhotos = await Promise.all(photoSnapshots.map(async (photo: any) => {
    if (typeof photo.objectKey !== "string") return [photo.objectKey, null] as const;
    const { data } = await supabase.storage.from("field-survey-photos").createSignedUrl(photo.objectKey, 300);
    return [photo.objectKey, data?.signedUrl ?? null] as const;
  }));
  const signedPhotoMap = new Map(signedPhotos);
  return links.flatMap((link: any) => {
    const revision = revisions.find((row: any) => row.id === link.survey_revision_id && row.survey_id === link.survey_id);
    const current = surveys.find((row: any) => row.id === link.survey_id);
    if (!revision || !current) return [];
    const rawSections = Array.isArray(revision.sections) ? revision.sections : [{ id: link.survey_id, name: "Felmérés", workType: revision.work_type, measurements: revision.measurements, notes: revision.notes ?? "", photoIds: [] }];
    const photos = (Array.isArray(revision.photos_snapshot) ? revision.photos_snapshot : []).map((photo: any, index: number) => ({
      id: `${revision.id}-${index}`,
      displayFilename: typeof photo.displayFilename === "string" ? photo.displayFilename : "Felmérési fotó",
      description: typeof photo.description === "string" ? photo.description : null,
      signedUrl: signedPhotoMap.get(photo.objectKey) ?? null,
    }));
    return [{
      id: link.id, surveyId: link.survey_id, surveyVersion: revision.version, currentVersion: current.version,
      revisionId: revision.id, sections: rawSections, notes: revision.notes, photos,
    } as ExecutionLinkedSurvey];
  });
}

export async function getExecutionPlanningWorkspace(organizationId: string, projectId: string | null, requestedPlanId?: string) {
  const supabase = await createClient();
  const db = supabase as unknown as LooseClient;
  let planQuery = db.from("execution_plans").select("id, title, description, project_id, version, created_at, updated_at, source_quotation_id, source_revision_id").eq("organization_id", organizationId).order("updated_at", { ascending: false });
  if (requestedPlanId) planQuery = planQuery.eq("id", requestedPlanId);
  else if (projectId) planQuery = planQuery.eq("project_id", projectId);
  else planQuery = planQuery.is("project_id", null);
  const plansResponse = await planQuery;
  if (plansResponse.error) throw new Error("A munkanaplók betöltése nem sikerült.");
  const plans = plansResponse.data ?? [];
  const planIds = plans.map((plan: any) => plan.id);
  if (!planIds.length) return { plans: [], acceptedQuotations: [], timelineByPlan: new Map<string, ExecutionTimelineItem[]>() };
  const [tasksResponse, quotesResponse, journalResponse, eventResponse, photosResponse] = await Promise.all([
    db.from("execution_tasks").select("id, plan_id, title, description, status, priority, due_date, sort_order, version").eq("organization_id", organizationId).in("plan_id", planIds).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    projectId ? db.from("quotations").select("id, name, finalized_revision_id, status").eq("organization_id", organizationId).eq("project_id", projectId).eq("status", "accepted").not("finalized_revision_id", "is", null).order("updated_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    db.from("execution_journal_entries").select("id, plan_id, task_id, work_date, category, content, problems, next_steps, created_by, created_at").eq("organization_id", organizationId).in("plan_id", planIds).order("work_date", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    db.from("execution_task_events").select("id, plan_id, task_id, from_status, to_status, changed_by, changed_at").eq("organization_id", organizationId).in("plan_id", planIds).order("changed_at", { ascending: false }).order("id", { ascending: false }).limit(100),
    db.from("execution_photos").select("id, project_id, plan_id, task_id, journal_entry_id, object_key, display_filename, mime_type, file_size, caption, category, uploaded_by, uploaded_at").eq("organization_id", organizationId).in("plan_id", planIds).order("uploaded_at", { ascending: false }).order("id", { ascending: false }).limit(100),
  ]);
  if (tasksResponse.error || quotesResponse.error || journalResponse.error || eventResponse.error || photosResponse.error) throw new Error("A munkanaplók részletei nem tölthetők be.");
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
      id: plan.id, projectId: plan.project_id, title: plan.title, description: plan.description, version: plan.version, createdAt: plan.created_at, updatedAt: plan.updated_at,
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
