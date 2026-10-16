import { describe, expect, it } from "vitest";
import { summarizeExecutionIndexTasks } from "./execution-overview-index";

describe("summarizeExecutionIndexTasks", () => {
  it("reports stored task statuses and the next open tasks without inventing plan status", () => {
    const result = summarizeExecutionIndexTasks([
      { id: "a", title: "Nyitott", status: "todo", dueDate: null },
      { id: "b", title: "Folyamatban", status: "in_progress", dueDate: "2026-10-20" },
      { id: "c", title: "Kész", status: "done", dueDate: null },
    ]);
    expect(result).toMatchObject({ total: 3, todo: 1, inProgress: 1, done: 1 });
    expect(result.nextTasks.map((task) => task.title)).toEqual(["Nyitott", "Folyamatban"]);
  });

  it("leaves an empty plan without a synthetic status or progress", () => {
    expect(summarizeExecutionIndexTasks([])).toEqual({ total: 0, todo: 0, inProgress: 0, done: 0, nextTasks: [] });
  });
});
