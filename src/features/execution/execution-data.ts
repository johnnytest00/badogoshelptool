import { executionPhotoCategorySchema, type ExecutionPhotoCategory } from "@/domain/execution/contracts";
import { surveySectionsSchema, type SurveySection } from "@/domain/field-surveys/workspace";
import { createClient } from "@/infrastructure/supabase/server";
import type { Database } from "@/infrastructure/supabase/database";
import { summarizeExecutionIndexTasks } from "./execution-overview-index";

type Tables = Database["public"]["Tables"];
type OverviewPlanRow = Pick<Tables["execution_plans"]["Row"], "id" | "project_id" | "title" | "updated_at">;
type PlanRow = Pick<Tables["execution_plans"]["Row"], "id" | "project_id" | "title" | "description" | "version" | "created_at" | "updated_at" | "source_quotation_id" | "source_revision_id">;
type TaskRow = Pick<Tables["execution_tasks"]["Row"], "id" | "plan_id" | "title" | "description" | "status" | "priority" | "due_date" | "sort_order" | "version">;
type JournalRow = Pick<Tables["execution_journal_entries"]["Row"], "id" | "plan_id" | "task_id" | "work_date" | "category" | "content" | "problems" | "next_steps" | "created_by" | "created_at">;
type EventRow = Pick<Tables["execution_task_events"]["Row"], "id" | "plan_id" | "task_id" | "from_status" | "to_status" | "changed_by" | "changed_at">;
type PhotoRow = Pick<Tables["execution_photos"]["Row"], "id" | "project_id" | "plan_id" | "task_id" | "journal_entry_id" | "object_key" | "display_filename" | "mime_type" | "file_size" | "caption" | "category" | "uploaded_by" | "uploaded_at">;
type QuotationRow = Pick<Tables["quotations"]["Row"], "id" | "name" | "finalized_revision_id" | "status">;

export type ExecutionTaskRecord = { id: string; title: string; description: string | null; status: "todo" | "in_progress" | "done"; priority: "low" | "normal" | "high"; dueDate: string | null; sortOrder: number; version: number };
export type ExecutionPhotoRecord = { id: string; taskId: string | null; taskTitle: string | null; journalEntryId: string | null; journalDate: string | null; journalContent: string | null; objectKey: string; displayFilename: string; mimeType: string; fileSize: number; caption: string | null; category: ExecutionPhotoCategory; uploadedAt: string; uploaderName: string | null; signedUrl: string | null };
export type ExecutionPlanRecord = { id: string; projectId: string | null; title: string; description: string | null; version: number; createdAt: string; updatedAt: string; sourceQuotationId: string | null; sourceRevisionId: string | null; sourceRevisionNumber: number | null; sourceQuotationName: string | null; sourceQuotationStatus: string | null; sourceSubtotal: number | null; tasks: ExecutionTaskRecord[]; photos: ExecutionPhotoRecord[] };
export type ExecutionPlanOption = { id: string; title: string; projectId: string | null; updatedAt: string };
export type ExecutionLinkedSurveyPhoto = { id: string; displayFilename: string; description: string | null; signedUrl: string | null };
export type ExecutionLinkedSurvey =
  | { status: "available"; id: string; surveyId: string; surveyVersion: number; currentVersion: number; revisionId: string; sections: SurveySection[]; notes: string | null; photos: ExecutionLinkedSurveyPhoto[] }
  | { status: "unavailable"; linkId: string; reason: "source_unavailable" | "invalid_snapshot" };
export type ExecutionLinkedSurveysResult =
  | { status: "loaded"; items: ExecutionLinkedSurvey[] }
  | { status: "unavailable" | "access_denied" };
export type AcceptedQuotationOption = { id: string; name: string; finalizedRevisionId: string; subtotal: string | null };
export type ExecutionTimelineItem = { id: string; type: "journal" | "task_event"; date: string; recordedAt: string; authorAvailable: boolean; taskTitle: string | null; category?: "general" | "work_done" | "problem" | "next_step"; content?: string; problems?: string | null; nextSteps?: string | null; fromStatus?: "todo" | "in_progress" | "done"; toStatus?: "todo" | "in_progress" | "done" };

function groupBy<T>(rows: readonly T[], keyOf: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

function firstById<T extends { id: string }>(rows: readonly T[]): Map<string, T> {
  const indexed = new Map<string, T>();
  for (const row of rows) if (!indexed.has(row.id)) indexed.set(row.id, row);
  return indexed;
}

async function readAllRows<T extends { id: string }>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown; count: number | null }>,
  errorMessage: string,
): Promise<T[]> {
  const pageSize = 100;
  const rows: T[] = [];
  const seen = new Set<string>();
  let expectedCount: number | null = null;
  while (true) {
    const { data, error, count } = await loadPage(rows.length, rows.length + pageSize - 1);
    if (error || !data || count === null || count < 0 || (expectedCount !== null && count !== expectedCount) || data.length > pageSize) throw new Error(errorMessage);
    expectedCount = count;
    for (const row of data) {
      if (seen.has(row.id)) throw new Error(errorMessage);
      seen.add(row.id);
      rows.push(row);
    }
    if (rows.length === count) return rows;
    if (!data.length || rows.length > count) throw new Error(errorMessage);
  }
}

function parseLinkedSurveySections(values: readonly unknown[]): SurveySection[] | null {
  const compatibleValues = values.map((value) => {
    const section = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
    return section && Array.isArray(section.measurements)
      ? {
          ...section,
          measurements: section.measurements.map((measurement) => {
            if (!measurement || typeof measurement !== "object" || Array.isArray(measurement)) return measurement;
            const record = measurement as Record<string, unknown>;
            // Historically valid revisions omitted this field and PostgreSQL treated it as "custom".
            return "semanticType" in record ? record : { ...record, semanticType: "custom" };
          }),
        }
      : value;
  });
  const parsed = surveySectionsSchema.safeParse(compatibleValues);
  return parsed.success ? parsed.data : null;
}

function isAuthorizationFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; status?: unknown };
  return value.status === 401 || value.status === 403 || ["42501", "PGRST301", "PGRST302"].includes(String(value.code));
}

export async function getExecutionOverviewForOrganization(organizationId: string) {
  const supabase = await createClient();
  const plansResponse = await supabase.from("execution_plans").select("id, project_id, title, updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(200);
  if (plansResponse.error) throw new Error("A kivitelezési áttekintő betöltése nem sikerült.");
  const plans: OverviewPlanRow[] = plansResponse.data ?? [];
  const planIds = plans.map((plan) => plan.id);
  if (!planIds.length) return [];
  const [tasksResponse, journalResponse, photosResponse] = await Promise.all([
    supabase.from("execution_tasks").select("id, plan_id, title, status, due_date").eq("organization_id", organizationId).in("plan_id", planIds).order("sort_order", { ascending: true }),
    supabase.from("execution_journal_entries").select("id, plan_id").eq("organization_id", organizationId).in("plan_id", planIds),
    supabase.from("execution_photos").select("id, plan_id").eq("organization_id", organizationId).in("plan_id", planIds),
  ]);
  if (tasksResponse.error || journalResponse.error || photosResponse.error) throw new Error("A kivitelezési feladatok áttekintése nem tölthető be.");
  const tasksByPlan = groupBy(tasksResponse.data ?? [], (task) => task.plan_id);
  const journalByPlan = groupBy(journalResponse.data ?? [], (entry) => entry.plan_id);
  const photosByPlan = groupBy(photosResponse.data ?? [], (photo) => photo.plan_id);
  return plans.map((plan) => {
    const tasks = (tasksByPlan.get(plan.id) ?? []).map((task) => ({ id: task.id, title: task.title, status: task.status, dueDate: task.due_date }));
    return {
      id: plan.id, projectId: plan.project_id, title: plan.title, updatedAt: plan.updated_at,
      tasks: summarizeExecutionIndexTasks(tasks),
      journalCount: journalByPlan.get(plan.id)?.length ?? 0,
      photoCount: photosByPlan.get(plan.id)?.length ?? 0,
    };
  });
}

export async function getExecutionPlanOptionsForOrganization(organizationId: string): Promise<ExecutionPlanOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("execution_plans").select("id,title,project_id,updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(200);
  if (error) throw new Error("A munkanapló-választó betöltése nem sikerült.");
  return (data ?? []).map((plan) => ({ id: plan.id, title: plan.title, projectId: plan.project_id, updatedAt: plan.updated_at }));
}

export async function getExecutionPlanForOrganization(organizationId: string, planId: string): Promise<ExecutionPlanOption | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("execution_plans").select("id,title,project_id,updated_at").eq("organization_id", organizationId).eq("id", planId).maybeSingle();
  if (error) throw new Error("A munkanapló betöltése nem sikerült.");
  return data ? { id: data.id, title: data.title, projectId: data.project_id, updatedAt: data.updated_at } : null;
}

export async function getExecutionPlanLinkedSurveys(organizationId: string, planId: string): Promise<ExecutionLinkedSurveysResult> {
  const supabase = await createClient();
  const { data: links, error: linksError } = await supabase.from("field_survey_execution_plan_links").select("id,survey_id,survey_revision_id,created_at").eq("organization_id", organizationId).eq("execution_plan_id", planId).order("created_at", { ascending: false });
  if (linksError) return { status: isAuthorizationFailure(linksError) ? "access_denied" : "unavailable" };
  if (!links?.length) return { status: "loaded", items: [] };
  const surveyIds = [...new Set(links.map((link) => link.survey_id))];
  const revisionIds = [...new Set(links.map((link) => link.survey_revision_id))];
  const [revisionsResponse, surveysResponse] = await Promise.all([
    supabase.from("field_survey_revisions").select("id,survey_id,version,work_type,sections,measurements,notes,photos_snapshot").eq("organization_id", organizationId).in("id", revisionIds),
    supabase.from("field_surveys").select("id,version").eq("organization_id", organizationId).in("id", surveyIds),
  ]);
  if (revisionsResponse.error || surveysResponse.error) return { status: isAuthorizationFailure(revisionsResponse.error) || isAuthorizationFailure(surveysResponse.error) ? "access_denied" : "unavailable" };
  const revisions = revisionsResponse.data ?? [];
  const surveys = firstById(surveysResponse.data ?? []);
  const photosByRevision = revisions.map((revision) => ({ revision, photos: Array.isArray(revision.photos_snapshot) ? revision.photos_snapshot : [] }));
  const photos = photosByRevision.flatMap(({ photos: snapshotPhotos }) => snapshotPhotos);
  const signedPhotos = await Promise.all(photos.map(async (photo) => {
    if (!photo || typeof photo !== "object" || Array.isArray(photo) || typeof photo.objectKey !== "string") return null;
    try {
      const { data } = await supabase.storage.from("field-survey-photos").createSignedUrl(photo.objectKey, 300);
      return [photo.objectKey, data?.signedUrl ?? null] as const;
    } catch {
      return [photo.objectKey, null] as const;
    }
  }));
  const signedPhotoMap = new Map(signedPhotos.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
  const items: ExecutionLinkedSurvey[] = [];
  for (const link of links) {
    const revision = revisions.find((row) => row.id === link.survey_revision_id && row.survey_id === link.survey_id);
    const current = surveys.get(link.survey_id);
    if (!revision || !current) {
      items.push({ status: "unavailable", linkId: link.id, reason: "source_unavailable" });
      continue;
    }
    const rawSections = parseLinkedSurveySections(Array.isArray(revision.sections)
      ? revision.sections
      : [{ id: link.survey_id, name: "Felmérés", workType: revision.work_type, measurements: revision.measurements, notes: revision.notes ?? "", photoIds: [] }]);
    if (!rawSections) {
      items.push({ status: "unavailable", linkId: link.id, reason: "invalid_snapshot" });
      continue;
    }
    const revisionPhotos = Array.isArray(revision.photos_snapshot) ? revision.photos_snapshot : [];
    const photoRecords = revisionPhotos.map((photo, index) => {
      const value = photo && typeof photo === "object" && !Array.isArray(photo) ? photo : {};
      return {
        id: `${revision.id}-${index}`,
        displayFilename: typeof value.displayFilename === "string" ? value.displayFilename : "Felmérési fotó",
        description: typeof value.description === "string" ? value.description : null,
        signedUrl: typeof value.objectKey === "string" ? signedPhotoMap.get(value.objectKey) ?? null : null,
      };
    });
    items.push({ status: "available", id: link.id, surveyId: link.survey_id, surveyVersion: revision.version, currentVersion: current.version, revisionId: revision.id, sections: rawSections, notes: revision.notes, photos: photoRecords });
  }
  return { status: "loaded", items };
}

export async function getExecutionPlanningWorkspace(organizationId: string, projectId: string | null, requestedPlanId?: string) {
  const supabase = await createClient();
  const plans = await readAllRows<PlanRow>((from, to) => {
    let query = supabase.from("execution_plans").select("id, title, description, project_id, version, created_at, updated_at, source_quotation_id, source_revision_id", { count: "exact" }).eq("organization_id", organizationId).order("updated_at", { ascending: false }).order("id", { ascending: true });
    if (requestedPlanId) query = query.eq("id", requestedPlanId);
    else if (projectId) query = query.eq("project_id", projectId);
    else query = query.is("project_id", null);
    return query.range(from, to);
  }, "A munkanaplók betöltése nem sikerült.");
  const planIds = plans.map((plan) => plan.id);
  if (!planIds.length) return { plans: [], acceptedQuotations: [], timelineByPlan: new Map<string, ExecutionTimelineItem[]>() };
  const detailError = "A munkanaplók részletei nem tölthetők be.";
  const [tasks, quotesResponse, journal, events, photos] = await Promise.all([
    readAllRows<TaskRow>((from, to) => supabase.from("execution_tasks").select("id, plan_id, title, description, status, priority, due_date, sort_order, version", { count: "exact" }).eq("organization_id", organizationId).in("plan_id", planIds).order("sort_order", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, to), detailError),
    projectId ? supabase.from("quotations").select("id, name, finalized_revision_id, status").eq("organization_id", organizationId).eq("project_id", projectId).eq("status", "accepted").not("finalized_revision_id", "is", null).order("updated_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    readAllRows<JournalRow>((from, to) => supabase.from("execution_journal_entries").select("id, plan_id, task_id, work_date, category, content, problems, next_steps, created_by, created_at", { count: "exact" }).eq("organization_id", organizationId).in("plan_id", planIds).order("work_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to), detailError),
    readAllRows<EventRow>((from, to) => supabase.from("execution_task_events").select("id, plan_id, task_id, from_status, to_status, changed_by, changed_at", { count: "exact" }).eq("organization_id", organizationId).in("plan_id", planIds).order("changed_at", { ascending: false }).order("id", { ascending: false }).range(from, to), detailError),
    readAllRows<PhotoRow>((from, to) => supabase.from("execution_photos").select("id, project_id, plan_id, task_id, journal_entry_id, object_key, display_filename, mime_type, file_size, caption, category, uploaded_by, uploaded_at", { count: "exact" }).eq("organization_id", organizationId).in("plan_id", planIds).order("uploaded_at", { ascending: false }).order("id", { ascending: false }).range(from, to), detailError),
  ]);
  if (quotesResponse.error) throw new Error(detailError);
  const quotes: QuotationRow[] = quotesResponse.data ?? [];
  const uploaderIds = [...new Set(photos.map((photo) => photo.uploaded_by).filter(Boolean))];
  const { data: uploaders } = uploaderIds.length ? await supabase.from("profiles").select("id, display_name").in("id", uploaderIds) : { data: [] };
  const uploaderMap = new Map((uploaders ?? []).map((profile) => [profile.id, profile.display_name] as const));
  const signedPhotos: Array<readonly [string, string | null]> = [];
  for (let start = 0; start < photos.length; start += 16) {
    signedPhotos.push(...await Promise.all(photos.slice(start, start + 16).map(async (photo) => {
      const { data } = await supabase.storage.from("execution-photos").createSignedUrl(photo.object_key, 300);
      return [photo.id, data?.signedUrl ?? null] as const;
    })));
  }
  const signedPhotoMap = new Map(signedPhotos);
  const sourceIds = plans.flatMap((plan) => plan.source_quotation_id ? [plan.source_quotation_id] : []);
  const { data: sourceQuotes, error: sourceQuoteError } = sourceIds.length ? await supabase.from("quotations").select("id, name, finalized_revision_id, status").in("id", sourceIds).eq("organization_id", organizationId) : { data: [], error: null };
  if (sourceQuoteError) throw new Error("A munkanapló pontos ajánlati forrása nem ellenőrizhető.");
  const revisionIds = plans.flatMap((plan) => plan.source_revision_id ? [plan.source_revision_id] : []);
  const { data: revisions, error: revisionError } = revisionIds.length ? await supabase.from("quotation_revisions").select("id, quotation_id, revision_number, subtotal").in("id", revisionIds).eq("organization_id", organizationId) : { data: [], error: null };
  if (revisionError) throw new Error("A munkanapló pontos ajánlati forrása nem ellenőrizhető.");
  const quoteMap = new Map((sourceQuotes ?? []).map((quote) => [quote.id, quote] as const));
  const revisionMap = new Map((revisions ?? []).map((revision) => [revision.id, revision] as const));
  const missingSource = plans.some((plan) => {
    if (plan.source_quotation_id === null && plan.source_revision_id === null) return false;
    const quote = plan.source_quotation_id ? quoteMap.get(plan.source_quotation_id) : undefined;
    const revision = plan.source_revision_id ? revisionMap.get(plan.source_revision_id) : undefined;
    return !quote || !revision || quote.status !== "accepted" || quote.finalized_revision_id !== plan.source_revision_id || revision.quotation_id !== plan.source_quotation_id;
  });
  if (missingSource) throw new Error("A munkanapló pontos ajánlati forrása nem ellenőrizhető.");
  const tasksByPlan = groupBy(tasks, (task) => task.plan_id);
  const photosByPlan = groupBy(photos, (photo) => photo.plan_id);
  const journalByPlan = groupBy(journal, (entry) => entry.plan_id);
  const eventsByPlan = groupBy(events, (event) => event.plan_id);
  const taskById = firstById(tasks);
  const journalById = firstById(journal);
  const timelineByPlan = new Map<string, ExecutionTimelineItem[]>();
  for (const plan of plans) {
    const taskTitle = (taskId: string | null) => taskId === null ? null : taskById.get(taskId)?.title ?? null;
    const items: ExecutionTimelineItem[] = [
      ...(journalByPlan.get(plan.id) ?? []).map((entry) => ({ id: entry.id, type: "journal" as const, date: entry.work_date, recordedAt: entry.created_at, authorAvailable: Boolean(entry.created_by), taskTitle: taskTitle(entry.task_id), category: entry.category, content: entry.content, problems: entry.problems, nextSteps: entry.next_steps })),
      ...(eventsByPlan.get(plan.id) ?? []).map((event) => ({ id: event.id, type: "task_event" as const, date: String(event.changed_at).slice(0, 10), recordedAt: event.changed_at, authorAvailable: Boolean(event.changed_by), taskTitle: taskTitle(event.task_id), fromStatus: event.from_status, toStatus: event.to_status })),
    ];
    items.sort((first, second) => `${second.date}|${second.recordedAt}|${second.id}`.localeCompare(`${first.date}|${first.recordedAt}|${first.id}`));
    timelineByPlan.set(plan.id, items);
  }
  const planRecords: ExecutionPlanRecord[] = plans.map((plan) => {
    const sourceRevision = plan.source_revision_id === null ? undefined : revisionMap.get(plan.source_revision_id);
    const sourceQuote = plan.source_quotation_id === null ? undefined : quoteMap.get(plan.source_quotation_id);
    return {
      id: plan.id, projectId: plan.project_id, title: plan.title, description: plan.description, version: plan.version, createdAt: plan.created_at, updatedAt: plan.updated_at,
      sourceQuotationId: plan.source_quotation_id, sourceRevisionId: plan.source_revision_id, sourceRevisionNumber: sourceRevision?.revision_number == null ? null : Number(sourceRevision.revision_number), sourceQuotationName: sourceQuote?.name ?? null, sourceQuotationStatus: sourceQuote?.status ?? null, sourceSubtotal: sourceRevision?.subtotal ?? null,
      tasks: (tasksByPlan.get(plan.id) ?? []).map((task): ExecutionTaskRecord => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.due_date, sortOrder: task.sort_order, version: task.version })),
      photos: (photosByPlan.get(plan.id) ?? []).map((photo): ExecutionPhotoRecord => {
        const journalEntry = photo.journal_entry_id === null ? undefined : journalById.get(photo.journal_entry_id);
        const task = photo.task_id === null ? undefined : taskById.get(photo.task_id);
        return { id: photo.id, taskId: photo.task_id, taskTitle: task?.title ?? null, journalEntryId: photo.journal_entry_id, journalDate: journalEntry?.work_date ?? null, journalContent: journalEntry?.content ?? null, objectKey: photo.object_key, displayFilename: photo.display_filename, mimeType: photo.mime_type, fileSize: Number(photo.file_size), caption: photo.caption, category: executionPhotoCategorySchema.parse(photo.category), uploadedAt: photo.uploaded_at, uploaderName: uploaderMap.get(photo.uploaded_by) ?? null, signedUrl: signedPhotoMap.get(photo.id) ?? null };
      }),
    };
  });
  return {
    plans: planRecords,
    acceptedQuotations: quotes.flatMap((quote): AcceptedQuotationOption[] => quote.finalized_revision_id === null ? [] : [{ id: quote.id, name: quote.name, finalizedRevisionId: quote.finalized_revision_id, subtotal: null }]),
    timelineByPlan,
  };
}
