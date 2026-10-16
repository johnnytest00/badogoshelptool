import { describe, expect, it } from "vitest";
import { buildExecutionOverview } from "./execution-overview";
import type { ExecutionPlanRecord, ExecutionTimelineItem } from "./execution-data";

const plan: ExecutionPlanRecord = {
  id: "plan-1", projectId: null, title: "DEMO terv", description: null, version: 1, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  sourceQuotationId: null, sourceRevisionId: null, sourceRevisionNumber: null, sourceQuotationName: null, sourceQuotationStatus: null, sourceSubtotal: null, tasks: [
    { id: "task-1", title: "Nyitott", description: null, status: "todo", priority: "normal", dueDate: "2026-10-01", sortOrder: 1, version: 1 },
    { id: "task-2", title: "Kész", description: null, status: "done", priority: "normal", dueDate: null, sortOrder: 2, version: 1 },
    { id: "task-3", title: "Folyamatban", description: null, status: "in_progress", priority: "high", dueDate: "2026-12-01", sortOrder: 3, version: 1 },
  ], photos: [],
};

const timeline: ExecutionTimelineItem[] = [
  { id: "old", type: "journal", date: "2026-10-01", recordedAt: "2026-10-01T10:00:00Z", authorAvailable: true, taskTitle: null, category: "general", content: "Régi" },
  { id: "new", type: "task_event", date: "2026-10-02", recordedAt: "2026-10-02T10:00:00Z", authorAvailable: true, taskTitle: "Nyitott", fromStatus: "todo", toStatus: "in_progress" },
  { id: "problem", type: "journal", date: "2026-10-02", recordedAt: "2026-10-02T09:00:00Z", authorAvailable: true, taskTitle: "Nyitott", category: "problem", content: "Akadály rögzítve" },
];

describe("buildExecutionOverview", () => {
  it("derives task counts, percentage, overdue attention and deterministic recent activity", () => {
    const result = buildExecutionOverview(plan, timeline, "2026-10-13");
    expect(result.totalTasks).toBe(3);
    expect(result.todoTasks).toBe(1);
    expect(result.inProgressTasks).toBe(1);
    expect(result.completedTasks).toBe(1);
    expect(result.progress).toBe(33);
    expect(result.attentionItems.map((item) => item.kind)).toEqual(["overdue_task", "open_task", "blocker"]);
    expect(result.recentActivity.map((item) => item.id)).toEqual(["new", "problem", "old"]);
  });

  it("does not show completion for an empty plan", () => {
    const result = buildExecutionOverview({ ...plan, tasks: [] }, [], "2026-10-13");
    expect(result.progress).toBeNull();
    expect(result.totalTasks).toBe(0);
    expect(result.attentionItems).toEqual([]);
  });
});
