import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getExecutionOverviewForOrganization, getExecutionPlanLinkedSurveys, getExecutionPlanningWorkspace } from "./execution-data";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

type QueryResult = { data: unknown[]; error: unknown; count: number };
type Filter = { kind: "eq" | "in" | "is" | "not"; column: string; value: unknown };

let rows: Record<string, unknown[]>;
let queryErrors: Record<string, unknown>;
let queryLog: Array<{ table: string; filters: Filter[]; limit: number | null; range: [number, number] | null }>;
let pageErrors: Record<string, { from: number; code: string }>;
let duplicatePage: Record<string, number>;
let changedCountPage: Record<string, number>;
let responseCap: number;
let signedUrlThrows: boolean;
let activeSignings: number;
let peakSignings: number;

function makeClient() {
  return {
    from(table: string) {
      const filters: Filter[] = [];
      let limit: number | null = null;
      let range: [number, number] | null = null;
      const orders: Array<{ column: string; ascending: boolean }> = [];
      const record: { table: string; filters: Filter[]; limit: number | null; range: [number, number] | null } = { table, filters, limit, range };
      queryLog.push(record);
      const result = (): QueryResult => {
        const filtered = (rows[table] ?? []).filter((value) => {
          const row = value as Record<string, unknown>;
          return filters.every((filter) => {
            if (filter.kind === "in") return (filter.value as unknown[]).includes(row[filter.column]);
            if (filter.kind === "not") return row[filter.column] !== filter.value;
            return row[filter.column] === filter.value;
          });
        }).sort((left, right) => {
          for (const { column, ascending } of orders) {
            const comparison = String((left as Record<string, unknown>)[column] ?? "").localeCompare(String((right as Record<string, unknown>)[column] ?? ""), undefined, { numeric: true });
            if (comparison) return ascending ? comparison : -comparison;
          }
          return 0;
        });
        const from = range?.[0] ?? 0;
        const to = Math.min(range?.[1] ?? (limit === null ? filtered.length : limit - 1), from + responseCap - 1);
        const data = duplicatePage[table] === from ? filtered.slice(0, Math.min(responseCap, to - from + 1)) : filtered.slice(from, to + 1);
        return { data, error: queryErrors[table] ?? (pageErrors[table]?.from === from ? { code: pageErrors[table].code, message: "page failure" } : null), count: filtered.length + (changedCountPage[table] === from ? 1 : 0) };
      };
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push({ kind: "eq", column, value }); return query; },
        in: (column: string, value: unknown) => { filters.push({ kind: "in", column, value }); return query; },
        is: (column: string, value: unknown) => { filters.push({ kind: "is", column, value }); return query; },
        not: (column: string, _operator: string, value: unknown) => { filters.push({ kind: "not", column, value }); return query; },
        order: (column: string, options?: { ascending?: boolean }) => { orders.push({ column, ascending: options?.ascending !== false }); return query; },
        limit: (value: number) => { limit = value; record.limit = value; return query; },
        range: (from: number, to: number) => { range = [from, to]; record.range = range; return query; },
        maybeSingle: async () => ({ data: result().data[0] ?? null, error: queryErrors[table] ?? null }),
        then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(resolve(result())),
      };
      return query;
    },
    storage: { from: () => ({ createSignedUrl: async (key: string) => {
      if (signedUrlThrows) throw new Error("temporary signing failure");
      activeSignings += 1;
      peakSignings = Math.max(peakSignings, activeSignings);
      await Promise.resolve();
      activeSignings -= 1;
      return { data: { signedUrl: `signed:${key}` } };
    } }) },
  };
}

const plan = (id: string, project_id: string | null = "project") => ({
  id, project_id, title: `Plan ${id}`, description: null, version: 1, created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-02T10:00:00Z", source_quotation_id: null, source_revision_id: null, organization_id: "org",
});

beforeEach(() => {
  rows = {};
  queryErrors = {};
  pageErrors = {};
  duplicatePage = {};
  changedCountPage = {};
  responseCap = 1000;
  queryLog = [];
  signedUrlThrows = false;
  activeSignings = 0;
  peakSignings = 0;
  vi.mocked(createClient).mockResolvedValue(makeClient() as unknown as Awaited<ReturnType<typeof createClient>>);
});

describe("execution data characterization", () => {
  it("returns empty workspace and overview without issuing child queries", async () => {
    rows.execution_plans = [];
    expect(await getExecutionPlanningWorkspace("org", "project")).toEqual({ plans: [], acceptedQuotations: [], timelineByPlan: new Map() });
    expect(await getExecutionOverviewForOrganization("org")).toEqual([]);
    expect(queryLog.map(({ table }) => table)).toEqual(["execution_plans", "execution_plans"]);
  });

  it.each([0, 1, 100, 101, 275])("loads every journal, event and photo identity across two interleaved plans (%i each)", async (count) => {
    rows.execution_plans = [plan("p1"), plan("p2")];
    const id = (prefix: string, index: number) => `${prefix}${String(index).padStart(3, "0")}`;
    rows.execution_tasks = ["p1", "p2"].map((planId) => ({ id: `task-${planId}`, plan_id: planId, title: planId, description: null, status: "todo", priority: "normal", due_date: null, sort_order: 0, version: 1, created_at: "2026-10-01", organization_id: "org" }));
    rows.execution_journal_entries = Array.from({ length: count }, (_, index) => ({ id: id("j", index), plan_id: index % 2 ? "p2" : "p1", task_id: `task-${index % 2 ? "p2" : "p1"}`, work_date: index === 0 ? "2026-10-01" : "2026-10-02", category: "general", content: id("journal-", index), problems: null, next_steps: null, created_by: "user", created_at: "2026-10-02T10:00:00Z", organization_id: "org" }));
    rows.execution_task_events = Array.from({ length: count }, (_, index) => ({ id: id("e", index), plan_id: index % 2 ? "p2" : "p1", task_id: `task-${index % 2 ? "p2" : "p1"}`, from_status: "todo", to_status: "done", changed_by: "user", changed_at: "2026-10-02T11:00:00Z", organization_id: "org" }));
    rows.execution_photos = Array.from({ length: count }, (_, index) => ({ id: id("ph", index), plan_id: index % 2 ? "p2" : "p1", project_id: "project", task_id: `task-${index % 2 ? "p2" : "p1"}`, journal_entry_id: id("j", index), object_key: `photo-${index}`, display_filename: `photo-${index}.jpg`, mime_type: "image/jpeg", file_size: 10, caption: null, category: "during", uploaded_by: "user", uploaded_at: "2026-10-02T12:00:00Z", organization_id: "org" }));
    rows.execution_journal_entries.push({ id: "unrelated-j", plan_id: "other-plan", organization_id: "org" }, { id: "other-org-j", plan_id: "p1", organization_id: "other-org" });
    rows.execution_task_events.push({ id: "unrelated-e", plan_id: "other-plan", organization_id: "org" }, { id: "other-org-e", plan_id: "p1", organization_id: "other-org" });
    rows.execution_photos.push({ id: "unrelated-ph", plan_id: "other-plan", organization_id: "org" }, { id: "other-org-ph", plan_id: "p1", organization_id: "other-org" });

    const workspace = await getExecutionPlanningWorkspace("org", "project");
    for (const [planId, parity] of [["p1", 0], ["p2", 1]] as const) {
      const indices = Array.from({ length: count }, (_, index) => index).filter((index) => index % 2 === parity).reverse();
      const expectedJournal = indices.filter((index) => index !== 0).map((index) => id("j", index));
      if (parity === 0 && count) expectedJournal.push("j000");
      expect(workspace.timelineByPlan.get(planId)?.filter((item) => item.type === "journal").map((item) => item.id)).toEqual(expectedJournal);
      expect(workspace.timelineByPlan.get(planId)?.filter((item) => item.type === "task_event").map((item) => item.id)).toEqual(indices.map((index) => id("e", index)));
      expect(workspace.plans.find((item) => item.id === planId)?.photos.map((photo) => photo.id)).toEqual(indices.map((index) => id("ph", index)));
      expect(workspace.plans.find((item) => item.id === planId)?.photos.map((photo) => photo.journalContent)).toEqual(indices.map((index) => id("journal-", index)));
    }
    if (count > 100) expect(queryLog.filter(({ table }) => ["execution_journal_entries", "execution_task_events", "execution_photos"].includes(table)).some(({ range }) => range?.[0] === 100)).toBe(true);
    if (count > 250) expect(queryLog.filter(({ table }) => ["execution_journal_entries", "execution_task_events", "execution_photos"].includes(table))).toHaveLength(9);
    if (count > 250) expect(peakSignings).toBeLessThanOrEqual(16);
  });

  it("fails the required workspace when a later page cannot be read", async () => {
    rows.execution_plans = [plan("p1")];
    rows.execution_journal_entries = Array.from({ length: 101 }, (_, index) => ({ id: `j${index}`, plan_id: "p1", organization_id: "org", work_date: "2026-10-02", created_at: "2026-10-02T10:00:00Z" }));
    pageErrors.execution_journal_entries = { from: 100, code: "XX000" };
    await expect(getExecutionPlanningWorkspace("org", "project", "p1")).rejects.toThrow("A munkanaplók részletei nem tölthetők be.");
  });

  it("continues when the server caps a page below the requested size", async () => {
    responseCap = 40;
    rows.execution_plans = [plan("p1")];
    rows.execution_task_events = Array.from({ length: 101 }, (_, index) => ({ id: `e${String(index).padStart(3, "0")}`, plan_id: "p1", task_id: null, from_status: "todo", to_status: "done", changed_by: "user", changed_at: "2026-10-02T11:00:00Z", organization_id: "org" }));
    const workspace = await getExecutionPlanningWorkspace("org", "project", "p1");
    expect(workspace.timelineByPlan.get("p1")?.map((item) => item.id)).toEqual(Array.from({ length: 101 }, (_, index) => `e${String(100 - index).padStart(3, "0")}`));
    expect(queryLog.filter(({ table }) => table === "execution_task_events").map(({ range }) => range?.[0])).toEqual([0, 40, 80]);
  });

  it("rejects duplicate later pages instead of presenting incomplete history", async () => {
    rows.execution_plans = [plan("p1")];
    rows.execution_task_events = Array.from({ length: 101 }, (_, index) => ({ id: `e${index}`, plan_id: "p1", organization_id: "org" }));
    duplicatePage.execution_task_events = 100;
    await expect(getExecutionPlanningWorkspace("org", "project", "p1")).rejects.toThrow("A munkanaplók részletei nem tölthetők be.");
  });

  it("rejects a changing row count across pages instead of silently omitting data", async () => {
    rows.execution_plans = [plan("p1")];
    rows.execution_task_events = Array.from({ length: 101 }, (_, index) => ({ id: `e${index}`, plan_id: "p1", organization_id: "org" }));
    changedCountPage.execution_task_events = 100;
    await expect(getExecutionPlanningWorkspace("org", "project", "p1")).rejects.toThrow("A munkanaplók részletei nem tölthetők be.");
  });

  it("does not turn a later-page permission denial into an empty timeline", async () => {
    rows.execution_plans = [plan("p1")];
    rows.execution_journal_entries = Array.from({ length: 101 }, (_, index) => ({ id: `j${index}`, plan_id: "p1", organization_id: "org" }));
    pageErrors.execution_journal_entries = { from: 100, code: "42501" };
    await expect(getExecutionPlanningWorkspace("org", "project", "p1")).rejects.toThrow("A munkanaplók részletei nem tölthetők be.");
  });

  it("preserves ordered associations, nullable links, missing relations and signed URLs", async () => {
    rows.execution_plans = [{ ...plan("p1"), source_quotation_id: "q1", source_revision_id: "r1" }, plan("p2")];
    rows.quotations = [{ id: "q1", name: "Accepted quotation", finalized_revision_id: "r1", status: "accepted", project_id: "project", updated_at: "2026-10-02", organization_id: "org" }];
    rows.quotation_revisions = [{ id: "r1", quotation_id: "q1", revision_number: 3, subtotal: 12345, organization_id: "org" }];
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
    expect(queryLog.find(({ table }) => table === "execution_photos")?.range).toEqual([0, 99]);
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

  it("does not return a workspace as source-complete when its exact quotation revision cannot be read", async () => {
    rows.execution_plans = [{ ...plan("p1"), source_quotation_id: "q1", source_revision_id: "r1" }];
    rows.quotations = [{ id: "q1", name: "Accepted", finalized_revision_id: "r1", status: "accepted", organization_id: "org" }];
    queryErrors.quotation_revisions = { code: "XX000", message: "temporary read failure" };

    await expect(getExecutionPlanningWorkspace("org", "project", "p1")).rejects.toThrow("A munkanapló pontos ajánlati forrása nem ellenőrizhető.");
  });

  it("rejects an inconsistent source revision instead of exporting an empty quotation section", async () => {
    rows.execution_plans = [{ ...plan("p1"), source_quotation_id: "q1", source_revision_id: "r1" }];
    rows.quotations = [{ id: "q1", name: "Accepted", finalized_revision_id: "r1", status: "accepted", organization_id: "org" }];
    rows.quotation_revisions = [{ id: "r1", quotation_id: "another-quotation", revision_number: 3, subtotal: 12345, organization_id: "org" }];

    await expect(getExecutionPlanningWorkspace("org", "project", "p1")).rejects.toThrow("A munkanapló pontos ajánlati forrása nem ellenőrizhető.");
  });

  it("keeps exact survey revisions and signed snapshot photos, skipping unavailable links", async () => {
    rows.field_survey_execution_plan_links = [
      { id: "link-1", survey_id: "00000000-0000-4000-8000-000000000002", survey_revision_id: "revision-1", created_at: "2026-10-02T10:00:00Z", organization_id: "org", execution_plan_id: "p1" },
      { id: "link-2", survey_id: "00000000-0000-4000-8000-000000000002", survey_revision_id: "revision-1", created_at: "2026-10-01T10:00:00Z", organization_id: "org", execution_plan_id: "p1" },
      { id: "link-missing", survey_id: "00000000-0000-4000-8000-000000000002", survey_revision_id: "missing", created_at: "2026-09-30T10:00:00Z", organization_id: "org", execution_plan_id: "p1" },
    ];
    rows.field_survey_revisions = [{
      id: "revision-1", survey_id: "00000000-0000-4000-8000-000000000002", version: 3, work_type: "roof", sections: null,
      measurements: [{ id: "00000000-0000-4000-8000-000000000001", label: "Hossz", value: 10, unit: "m" }], notes: "Snapshot",
      photos_snapshot: [{ objectKey: "survey-photo.jpg", displayFilename: "Tető.jpg", description: "Régi fotó" }], organization_id: "org",
    }];
    rows.field_surveys = [{ id: "00000000-0000-4000-8000-000000000002", version: 5, organization_id: "org" }];

    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toEqual({ status: "loaded", items: [
      { status: "available", id: "link-1", surveyId: "00000000-0000-4000-8000-000000000002", surveyVersion: 3, currentVersion: 5, revisionId: "revision-1", sections: [{ id: "00000000-0000-4000-8000-000000000002", name: "Felmérés", workType: "roof", measurements: [{ id: "00000000-0000-4000-8000-000000000001", label: "Hossz", value: 10, unit: "m", semanticType: "custom" }], notes: "Snapshot", photoIds: [] }], notes: "Snapshot", photos: [{ id: "revision-1-0", displayFilename: "Tető.jpg", description: "Régi fotó", signedUrl: "signed:survey-photo.jpg" }] },
      { status: "available", id: "link-2", surveyId: "00000000-0000-4000-8000-000000000002", surveyVersion: 3, currentVersion: 5, revisionId: "revision-1", sections: [{ id: "00000000-0000-4000-8000-000000000002", name: "Felmérés", workType: "roof", measurements: [{ id: "00000000-0000-4000-8000-000000000001", label: "Hossz", value: 10, unit: "m", semanticType: "custom" }], notes: "Snapshot", photoIds: [] }], notes: "Snapshot", photos: [{ id: "revision-1-0", displayFilename: "Tető.jpg", description: "Régi fotó", signedUrl: "signed:survey-photo.jpg" }] },
      { status: "unavailable", linkId: "link-missing", reason: "source_unavailable" },
    ] });
    expect(queryLog.filter(({ table }) => ["field_survey_execution_plan_links", "field_survey_revisions", "field_surveys"].includes(table)).every(({ filters }) => filters.some((filter) => filter.kind === "eq" && filter.column === "organization_id" && filter.value === "org"))).toBe(true);
  });

  it("reads historical section measurements without semanticType as custom", async () => {
    rows.field_survey_execution_plan_links = [{ id: "link", survey_id: "survey", survey_revision_id: "revision", created_at: "2026-10-02", organization_id: "org", execution_plan_id: "p1" }];
    rows.field_survey_revisions = [{
      id: "revision", survey_id: "survey", version: 1, work_type: "roof", notes: null, photos_snapshot: [], organization_id: "org",
      sections: [{ id: "00000000-0000-4000-8000-000000000001", name: "Régi szakasz", workType: "roof", measurements: [{ id: "00000000-0000-4000-8000-000000000002", label: "Hossz", value: 10, unit: "m" }], notes: "", photoIds: [] }],
    }];
    rows.field_surveys = [{ id: "survey", version: 1, organization_id: "org" }];

    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toMatchObject({
      status: "loaded", items: [{ status: "available", revisionId: "revision", sections: [{ measurements: [{ id: "00000000-0000-4000-8000-000000000002", value: 10, unit: "m", semanticType: "custom" }] }] }],
    });
  });

  it("isolates one malformed survey snapshot from its valid siblings", async () => {
    rows.field_survey_execution_plan_links = [
      { id: "link-invalid", survey_id: "survey-invalid", survey_revision_id: "revision-invalid", created_at: "2026-10-02", organization_id: "org", execution_plan_id: "p1" },
      { id: "link-valid", survey_id: "survey-valid", survey_revision_id: "revision-valid", created_at: "2026-10-01", organization_id: "org", execution_plan_id: "p1" },
    ];
    rows.field_survey_revisions = [{
      id: "revision-invalid", survey_id: "survey-invalid", version: 1, work_type: "roof", notes: null, photos_snapshot: [], organization_id: "org",
      sections: [{ id: "00000000-0000-4000-8000-000000000001", name: "Hibás szakasz", workType: "roof", measurements: [], notes: "", photoIds: [], unexpected: true }],
    }, {
      id: "revision-valid", survey_id: "survey-valid", version: 2, work_type: "gutter", notes: null, photos_snapshot: [], organization_id: "org",
      sections: [{ id: "00000000-0000-4000-8000-000000000003", name: "Érvényes szakasz", workType: "gutter", measurements: [], notes: "", photoIds: [] }],
    }];
    rows.field_surveys = [{ id: "survey-invalid", version: 1, organization_id: "org" }, { id: "survey-valid", version: 2, organization_id: "org" }];

    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toEqual({
      status: "loaded",
      items: [
        { status: "unavailable", linkId: "link-invalid", reason: "invalid_snapshot" },
        { status: "available", id: "link-valid", surveyId: "survey-valid", surveyVersion: 2, currentVersion: 2, revisionId: "revision-valid", sections: [{ id: "00000000-0000-4000-8000-000000000003", name: "Érvényes szakasz", workType: "gutter", measurements: [], notes: "", photoIds: [] }], notes: null, photos: [] },
      ],
    });
  });

  it("marks empty section arrays unavailable instead of rejecting the whole list", async () => {
    rows.field_survey_execution_plan_links = [{ id: "link", survey_id: "survey", survey_revision_id: "revision", created_at: "2026-10-02", organization_id: "org", execution_plan_id: "p1" }];
    rows.field_survey_revisions = [{ id: "revision", survey_id: "survey", version: 1, work_type: "roof", sections: [], measurements: [], notes: null, photos_snapshot: [], organization_id: "org" }];
    rows.field_surveys = [{ id: "survey", version: 1, organization_id: "org" }];

    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toEqual({ status: "loaded", items: [{ status: "unavailable", linkId: "link", reason: "invalid_snapshot" }] });
  });

  it("returns an explicit access-denied survey-panel state for an RLS read error", async () => {
    queryErrors.field_survey_execution_plan_links = { code: "42501", message: "permission denied" };

    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toEqual({ status: "access_denied" });
  });

  it("keeps an optional survey query failure recoverable and retries on the next load", async () => {
    queryErrors.field_survey_execution_plan_links = { code: "XX000", message: "temporary database failure" };
    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toEqual({ status: "unavailable" });

    queryErrors = {};
    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toEqual({ status: "loaded", items: [] });
  });

  it("keeps a linked photo failure local to that photo", async () => {
    signedUrlThrows = true;
    rows.field_survey_execution_plan_links = [{ id: "link", survey_id: "survey", survey_revision_id: "revision", created_at: "2026-10-02", organization_id: "org", execution_plan_id: "p1" }];
    rows.field_survey_revisions = [{
      id: "revision", survey_id: "survey", version: 1, work_type: "roof", notes: null, organization_id: "org",
      sections: [{ id: "00000000-0000-4000-8000-000000000001", name: "Szakasz", workType: "roof", measurements: [], notes: "", photoIds: [] }],
      photos_snapshot: [{ objectKey: "private.jpg", displayFilename: "Fotó.jpg" }],
    }];
    rows.field_surveys = [{ id: "survey", version: 1, organization_id: "org" }];

    await expect(getExecutionPlanLinkedSurveys("org", "p1")).resolves.toMatchObject({
      status: "loaded", items: [{ status: "available", photos: [{ displayFilename: "Fotó.jpg", signedUrl: null }] }],
    });
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
        expect(queryLog.filter(({ table }) => table === "execution_plans")).toHaveLength(Math.ceil(count / 100));
        expect(queryLog.filter(({ table }) => table === "execution_tasks" || table === "execution_journal_entries")).toHaveLength(2 * Math.ceil(count * 2 / 100));
        expect(queryLog.filter(({ table }) => table === "execution_task_events")).toHaveLength(Math.ceil(count / 100));
        expect(queryLog.filter(({ table }) => table === "execution_photos")).toHaveLength(Math.ceil(count * 3 / 100));
        expect(queryLog.filter(({ table }) => table === "quotations" || table === "profiles")).toHaveLength(2);
      }
      samples.sort((a, b) => a - b);
      timings.push({ plans: count, medianMs: Number(samples[10].toFixed(3)) });
    }
    if (process.env.EXECUTION_DATA_BENCHMARK === "1") console.info("execution-data workspace median (mock client, 21 runs)", timings);
  });
});
