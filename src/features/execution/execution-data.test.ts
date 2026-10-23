import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getExecutionOverviewForOrganization, getExecutionPlanLinkedSurveys, getExecutionPlanningWorkspace } from "./execution-data";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

type QueryResult = { data: unknown[]; error: null };
type Filter = { kind: "eq" | "in" | "is" | "not"; column: string; value: unknown };

let rows: Record<string, unknown[]>;
let queryLog: Array<{ table: string; filters: Filter[]; limit: number | null }>;

function makeClient() {
  return {
    from(table: string) {
      const filters: Filter[] = [];
      let limit: number | null = null;
      const record: { table: string; filters: Filter[]; limit: number | null } = { table, filters, limit };
      queryLog.push(record);
      const result = (): QueryResult => ({
        data: (rows[table] ?? []).filter((value) => {
          const row = value as Record<string, unknown>;
          return filters.every((filter) => {
            if (filter.kind === "in") return (filter.value as unknown[]).includes(row[filter.column]);
            if (filter.kind === "not") return row[filter.column] !== filter.value;
            return row[filter.column] === filter.value;
          });
        }),
        error: null,
      });
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push({ kind: "eq", column, value }); return query; },
        in: (column: string, value: unknown) => { filters.push({ kind: "in", column, value }); return query; },
        is: (column: string, value: unknown) => { filters.push({ kind: "is", column, value }); return query; },
        not: (column: string, _operator: string, value: unknown) => { filters.push({ kind: "not", column, value }); return query; },
        order: () => query,
        limit: (value: number) => { limit = value; record.limit = value; return query; },
        maybeSingle: async () => ({ data: result().data[0] ?? null, error: null }),
        then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(resolve(result())),
      };
      return query;
    },
    storage: { from: () => ({ createSignedUrl: async (key: string) => ({ data: { signedUrl: `signed:${key}` } }) }) },
  };
}

const plan = (id: string, project_id: string | null = "project") => ({
  id, project_id, title: `Plan ${id}`, description: null, version: 1, created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-02T10:00:00Z", source_quotation_id: null, source_revision_id: null, organization_id: "org",
});

beforeEach(() => {
  rows = {};
  queryLog = [];
  vi.mocked(createClient).mockResolvedValue(makeClient() as unknown as Awaited<ReturnType<typeof createClient>>);
});

describe("execution data characterization", () => {
  it("returns empty workspace and overview without issuing child queries", async () => {
    rows.execution_plans = [];
    expect(await getExecutionPlanningWorkspace("org", "project")).toEqual({ plans: [], acceptedQuotations: [], timelineByPlan: new Map() });
    expect(await getExecutionOverviewForOrganization("org")).toEqual([]);
    expect(queryLog.map(({ table }) => table)).toEqual(["execution_plans", "execution_plans"]);
  });

  it("preserves ordered associations, nullable links, missing relations and signed URLs", async () => {
    rows.execution_plans = [{ ...plan("p1"), source_quotation_id: "q1", source_revision_id: "r1" }, plan("p2")];
    rows.quotations = [{ id: "q1", name: "Accepted quotation", finalized_revision_id: "r1", status: "accepted", project_id: "project", updated_at: "2026-10-02", organization_id: "org" }];
    rows.quotation_revisions = [{ id: "r1", revision_number: 3, subtotal: 12345, organization_id: "org" }];
    rows.execution_tasks = [
      { id: "t1", plan_id: "p1", title: "Task 1", description: null, status: "todo", priority: "normal", due_date: null, sort_order: 1, version: 2, created_at: "2026-10-01", organization_id: "org" },
      { id: "t2", plan_id: "p1", title: "Task 2", description: "Detail", status: "done", priority: "high", due_date: "2026-10-05", sort_order: 2, version: 1, created_at: "2026-10-01", organization_id: "org" },
      { id: "t3", plan_id: "p2", title: "Task 3", description: null, status: "in_progress", priority: "low", due_date: null, sort_order: 1, version: 1, created_at: "2026-10-01", organization_id: "org" },
      { id: "tenant-task", plan_id: "p1", title: "Other tenant", description: null, status: "todo", priority: "normal", due_date: null, sort_order: 0, version: 1, created_at: "2026-10-01", organization_id: "other-org" },
    ];
    rows.execution_journal_entries = [
      { id: "j1", plan_id: "p1", task_id: "t1", work_date: "2026-10-02", category: "work_done", content: "Done", problems: null, next_steps: null, created_by: "user", created_at: "2026-10-02T10:00:00Z", organization_id: "org" },
      { id: "j2", plan_id: "p1", task_id: null, work_date: "2026-10-01", category: "general", content: "General", problems: null, next_steps: null, created_by: "user", created_at: "2026-10-01T10:00:00Z", organization_id: "org" },
      { id: "j3", plan_id: "p2", task_id: "deleted-task", work_date: "2026-10-03", category: "problem", content: "Issue", problems: "Missing", next_steps: null, created_by: "user", created_at: "2026-10-03T10:00:00Z", organization_id: "org" },
    ];
    rows.execution_task_events = [
      { id: "e1", plan_id: "p1", task_id: "t1", from_status: "todo", to_status: "in_progress", changed_by: null, changed_at: "2026-10-02T11:00:00Z", organization_id: "org" },
    ];
    rows.execution_photos = [
      { id: "ph1", plan_id: "p1", project_id: "project", task_id: "t1", journal_entry_id: "j1", object_key: "one.jpg", display_filename: "one.jpg", mime_type: "image/jpeg", file_size: 10, caption: null, category: "during", uploaded_by: "u1", uploaded_at: "2026-10-02T12:00:00Z", organization_id: "org" },
      { id: "ph2", plan_id: "p1", project_id: "project", task_id: null, journal_entry_id: null, object_key: "two.jpg", display_filename: "two.jpg", mime_type: "image/jpeg", file_size: 12, caption: "Caption", category: "after", uploaded_by: "gone", uploaded_at: "2026-10-01T12:00:00Z", organization_id: "org" },
      { id: "ph3", plan_id: "p2", project_id: "project", task_id: "deleted-task", journal_entry_id: "deleted-entry", object_key: "three.jpg", display_filename: "three.jpg", mime_type: "image/jpeg", file_size: 14, caption: null, category: "during", uploaded_by: "u1", uploaded_at: "2026-10-03T12:00:00Z", organization_id: "org" },
      { id: "unrelated", plan_id: "other-plan", project_id: "project", task_id: null, journal_entry_id: null, object_key: "other.jpg", display_filename: "other.jpg", mime_type: "image/jpeg", file_size: 99, caption: null, category: "during", uploaded_by: "u1", uploaded_at: "2026-10-04T12:00:00Z", organization_id: "org" },
      { id: "tenant-photo", plan_id: "p1", project_id: "project", task_id: null, journal_entry_id: null, object_key: "tenant.jpg", display_filename: "tenant.jpg", mime_type: "image/jpeg", file_size: 99, caption: null, category: "during", uploaded_by: "u1", uploaded_at: "2026-10-05T12:00:00Z", organization_id: "other-org" },
    ];
    rows.profiles = [{ id: "u1", display_name: "Uploader" }];

    const workspace = await getExecutionPlanningWorkspace("org", "project");
    expect(workspace.plans).toEqual([
      {
        id: "p1", projectId: "project", title: "Plan p1", description: null, version: 1, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z",
        sourceQuotationId: "q1", sourceRevisionId: "r1", sourceRevisionNumber: 3, sourceQuotationName: "Accepted quotation", sourceQuotationStatus: "accepted", sourceSubtotal: 12345,
        tasks: [
          { id: "t1", title: "Task 1", description: null, status: "todo", priority: "normal", dueDate: null, sortOrder: 1, version: 2 },
          { id: "t2", title: "Task 2", description: "Detail", status: "done", priority: "high", dueDate: "2026-10-05", sortOrder: 2, version: 1 },
        ],
        photos: [
          { id: "ph1", taskId: "t1", taskTitle: "Task 1", journalEntryId: "j1", journalDate: "2026-10-02", journalContent: "Done", objectKey: "one.jpg", displayFilename: "one.jpg", mimeType: "image/jpeg", fileSize: 10, caption: null, category: "during", uploadedAt: "2026-10-02T12:00:00Z", uploaderName: "Uploader", signedUrl: "signed:one.jpg" },
          { id: "ph2", taskId: null, taskTitle: null, journalEntryId: null, journalDate: null, journalContent: null, objectKey: "two.jpg", displayFilename: "two.jpg", mimeType: "image/jpeg", fileSize: 12, caption: "Caption", category: "after", uploadedAt: "2026-10-01T12:00:00Z", uploaderName: null, signedUrl: "signed:two.jpg" },
        ],
      },
      {
        id: "p2", projectId: "project", title: "Plan p2", description: null, version: 1, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-02T10:00:00Z",
        sourceQuotationId: null, sourceRevisionId: null, sourceRevisionNumber: null, sourceQuotationName: null, sourceQuotationStatus: null, sourceSubtotal: null,
        tasks: [{ id: "t3", title: "Task 3", description: null, status: "in_progress", priority: "low", dueDate: null, sortOrder: 1, version: 1 }],
        photos: [{ id: "ph3", taskId: "deleted-task", taskTitle: null, journalEntryId: "deleted-entry", journalDate: null, journalContent: null, objectKey: "three.jpg", displayFilename: "three.jpg", mimeType: "image/jpeg", fileSize: 14, caption: null, category: "during", uploadedAt: "2026-10-03T12:00:00Z", uploaderName: "Uploader", signedUrl: "signed:three.jpg" }],
      },
    ]);
    expect([...workspace.timelineByPlan]).toEqual([
      ["p1", [
        { id: "e1", type: "task_event", date: "2026-10-02", recordedAt: "2026-10-02T11:00:00Z", authorAvailable: false, taskTitle: "Task 1", fromStatus: "todo", toStatus: "in_progress" },
        { id: "j1", type: "journal", date: "2026-10-02", recordedAt: "2026-10-02T10:00:00Z", authorAvailable: true, taskTitle: "Task 1", category: "work_done", content: "Done", problems: null, nextSteps: null },
        { id: "j2", type: "journal", date: "2026-10-01", recordedAt: "2026-10-01T10:00:00Z", authorAvailable: true, taskTitle: null, category: "general", content: "General", problems: null, nextSteps: null },
      ]],
      ["p2", [{ id: "j3", type: "journal", date: "2026-10-03", recordedAt: "2026-10-03T10:00:00Z", authorAvailable: true, taskTitle: null, category: "problem", content: "Issue", problems: "Missing", nextSteps: null }]],
    ]);
    expect(workspace.acceptedQuotations).toEqual([{ id: "q1", name: "Accepted quotation", finalizedRevisionId: "r1", subtotal: null }]);
    expect(queryLog.find(({ table }) => table === "execution_photos")?.filters).toContainEqual({ kind: "eq", column: "organization_id", value: "org" });
    expect(queryLog.find(({ table }) => table === "execution_photos")?.limit).toBe(100);
    expect(queryLog.filter(({ table }) => table !== "profiles").every(({ filters }) => filters.some((filter) => filter.kind === "eq" && filter.column === "organization_id" && filter.value === "org"))).toBe(true);
  });

  it("groups overview rows by plan without changing counts or next task order", async () => {
    rows.execution_plans = [plan("p1"), plan("p2")];
    rows.execution_tasks = [
      { id: "t1", plan_id: "p1", title: "Open", status: "todo", due_date: null, sort_order: 1, organization_id: "org" },
      { id: "t2", plan_id: "p2", title: "Done", status: "done", due_date: null, sort_order: 1, organization_id: "org" },
    ];
    rows.execution_journal_entries = [{ id: "j1", plan_id: "p1", organization_id: "org" }, { id: "j2", plan_id: "p1", organization_id: "org" }];
    rows.execution_photos = [{ id: "ph1", plan_id: "p2", organization_id: "org" }];
    await expect(getExecutionOverviewForOrganization("org")).resolves.toEqual([
      { id: "p1", projectId: "project", title: "Plan p1", updatedAt: "2026-10-02T10:00:00Z", tasks: { total: 1, todo: 1, inProgress: 0, done: 0, nextTasks: [{ id: "t1", title: "Open", status: "todo", dueDate: null }] }, journalCount: 2, photoCount: 0 },
      { id: "p2", projectId: "project", title: "Plan p2", updatedAt: "2026-10-02T10:00:00Z", tasks: { total: 1, todo: 0, inProgress: 0, done: 1, nextTasks: [] }, journalCount: 0, photoCount: 1 },
    ]);
    expect(queryLog.find(({ table }) => table === "execution_plans")?.limit).toBe(200);
  });

  it("keeps exact survey revisions and signed snapshot photos, skipping unavailable links", async () => {
    rows.field_survey_execution_plan_links = [
      { id: "link-1", survey_id: "00000000-0000-4000-8000-000000000002", survey_revision_id: "revision-1", created_at: "2026-10-02T10:00:00Z", organization_id: "org", execution_plan_id: "p1" },
      { id: "link-2", survey_id: "00000000-0000-4000-8000-000000000002", survey_revision_id: "revision-1", created_at: "2026-10-01T10:00:00Z", organization_id: "org", execution_plan_id: "p1" },
      { id: "link-missing", survey_id: "00000000-0000-4000-8000-000000000002", survey_revision_id: "missing", created_at: "2026-09-30T10:00:00Z", organization_id: "org", execution_plan_id: "p1" },
    ];
    rows.field_survey_revisions = [{
      id: "revision-1", survey_id: "00000000-0000-4000-8000-000000000002", version: 3, work_type: "roof", sections: null,
      measurements: [{ id: "00000000-0000-4000-8000-000000000001", label: "Hossz", value: 10, unit: "m", semanticType: "custom" }], notes: "Snapshot",
      photos_snapshot: [{ objectKey: "survey-photo.jpg", displayFilename: "Tető.jpg", description: "Régi fotó" }], organization_id: "org",
    }];
    rows.field_surveys = [{ id: "00000000-0000-4000-8000-000000000002", version: 5, organization_id: "org" }];

    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toEqual([
      { id: "link-1", surveyId: "00000000-0000-4000-8000-000000000002", surveyVersion: 3, currentVersion: 5, revisionId: "revision-1", sections: [{ id: "00000000-0000-4000-8000-000000000002", name: "Felmérés", workType: "roof", measurements: [{ id: "00000000-0000-4000-8000-000000000001", label: "Hossz", value: 10, unit: "m", semanticType: "custom" }], notes: "Snapshot", photoIds: [] }], notes: "Snapshot", photos: [{ id: "revision-1-0", displayFilename: "Tető.jpg", description: "Régi fotó", signedUrl: "signed:survey-photo.jpg" }] },
      { id: "link-2", surveyId: "00000000-0000-4000-8000-000000000002", surveyVersion: 3, currentVersion: 5, revisionId: "revision-1", sections: [{ id: "00000000-0000-4000-8000-000000000002", name: "Felmérés", workType: "roof", measurements: [{ id: "00000000-0000-4000-8000-000000000001", label: "Hossz", value: 10, unit: "m", semanticType: "custom" }], notes: "Snapshot", photoIds: [] }], notes: "Snapshot", photos: [{ id: "revision-1-0", displayFilename: "Tető.jpg", description: "Régi fotó", signedUrl: "signed:survey-photo.jpg" }] },
    ]);
    expect(queryLog.filter(({ table }) => ["field_survey_execution_plan_links", "field_survey_revisions", "field_surveys"].includes(table)).every(({ filters }) => filters.some((filter) => filter.kind === "eq" && filter.column === "organization_id" && filter.value === "org"))).toBe(true);
  });

  it("maps deterministic 1/50/200-plan collections with the expected row and request counts", async () => {
    const timings: Array<{ plans: number; medianMs: number }> = [];
    for (const count of [1, 50, 200]) {
      rows.execution_plans = Array.from({ length: count }, (_, i) => plan(`p${i}`));
      rows.execution_tasks = Array.from({ length: count * 2 }, (_, i) => ({ id: `t${i}`, plan_id: `p${Math.floor(i / 2)}`, title: `Task ${i}`, description: null, status: i % 2 ? "done" : "todo", priority: "normal", due_date: null, sort_order: i % 2, version: 1, created_at: "2026-10-01", organization_id: "org" }));
      rows.execution_journal_entries = Array.from({ length: count * 2 }, (_, i) => ({ id: `j${i}`, plan_id: `p${Math.floor(i / 2)}`, task_id: `t${i}`, work_date: "2026-10-01", category: "general", content: "Entry", problems: null, next_steps: null, created_by: "user", created_at: "2026-10-01T10:00:00Z", organization_id: "org" }));
      rows.execution_task_events = Array.from({ length: count }, (_, i) => ({ id: `e${i}`, plan_id: `p${i}`, task_id: `t${i * 2}`, from_status: "todo", to_status: "in_progress", changed_by: "user", changed_at: "2026-10-01T11:00:00Z", organization_id: "org" }));
      rows.execution_photos = Array.from({ length: count * 3 }, (_, i) => ({ id: `ph${i}`, plan_id: `p${Math.floor(i / 3)}`, project_id: "project", task_id: `t${Math.floor(i / 3) * 2}`, journal_entry_id: `j${Math.floor(i / 3) * 2}`, object_key: `photo-${i}`, display_filename: `photo-${i}.jpg`, mime_type: "image/jpeg", file_size: 10, caption: null, category: "during", uploaded_by: "u1", uploaded_at: "2026-10-01T12:00:00Z", organization_id: "org" }));
      rows.profiles = [{ id: "u1", display_name: "Uploader" }];

      const samples: number[] = [];
      for (let repeat = 0; repeat < 21; repeat += 1) {
        queryLog = [];
        const startedAt = performance.now();
        const result = await getExecutionPlanningWorkspace("org", "project");
        samples.push(performance.now() - startedAt);
        expect(result.plans).toHaveLength(count);
        expect(result.plans.reduce((total, item) => total + item.tasks.length, 0)).toBe(count * 2);
        expect(result.plans.reduce((total, item) => total + item.photos.length, 0)).toBe(count * 3);
        expect([...result.timelineByPlan.values()].reduce((total, item) => total + item.length, 0)).toBe(count * 3);
        expect(queryLog.map(({ table }) => table)).toEqual(["execution_plans", "execution_tasks", "quotations", "execution_journal_entries", "execution_task_events", "execution_photos", "profiles"]);
      }
      samples.sort((a, b) => a - b);
      timings.push({ plans: count, medianMs: Number(samples[10].toFixed(3)) });
    }
    if (process.env.EXECUTION_DATA_BENCHMARK === "1") console.info("execution-data workspace median (mock client, 21 runs)", timings);
  });
});
