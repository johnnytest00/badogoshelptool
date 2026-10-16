export type ExecutionIndexTask = Readonly<{ id: string; title: string; status: "todo" | "in_progress" | "done"; dueDate: string | null }>;

export function summarizeExecutionIndexTasks(tasks: readonly ExecutionIndexTask[]) {
  return {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "todo").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length,
    nextTasks: tasks.filter((task) => task.status !== "done").slice(0, 3),
  };
}
