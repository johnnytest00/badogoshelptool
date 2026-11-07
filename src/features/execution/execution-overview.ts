import type { ExecutionPlanRecord, ExecutionTaskRecord, ExecutionTimelineItem } from "./execution-data";

export type ExecutionAttentionItem = {
  kind: "open_task" | "overdue_task" | "blocker";
  title: string;
  detail: string;
  taskId?: string;
  journalId?: string;
};

export type ExecutionOverviewModel = {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  progress: number | null;
  recentActivity: ExecutionTimelineItem[];
  recentPhotos: ExecutionPlanRecord["photos"];
  attentionItems: ExecutionAttentionItem[];
  nextTask: ExecutionTaskRecord | null;
};

function isOpen(task: ExecutionTaskRecord) {
  return task.status !== "done";
}

export function buildExecutionOverview(plan: ExecutionPlanRecord, timeline: ExecutionTimelineItem[], today: string): ExecutionOverviewModel {
  const completedTasks = plan.tasks.filter((task) => task.status === "done").length;
  const nextTask = [...plan.tasks.filter(isOpen)].sort((first, second) => {
    const firstOverdue = Boolean(first.dueDate && first.dueDate < today);
    const secondOverdue = Boolean(second.dueDate && second.dueDate < today);
    if (firstOverdue !== secondOverdue) return firstOverdue ? -1 : 1;
    if (first.status !== second.status) return first.status === "in_progress" ? -1 : second.status === "in_progress" ? 1 : 0;
    return (first.dueDate ?? "9999-12-31").localeCompare(second.dueDate ?? "9999-12-31") || first.sortOrder - second.sortOrder || first.id.localeCompare(second.id);
  })[0] ?? null;
  const attentionItems: ExecutionAttentionItem[] = plan.tasks
    .filter(isOpen)
    .map((task) => ({
      kind: task.dueDate && task.dueDate < today ? "overdue_task" as const : "open_task" as const,
      title: task.title,
      detail: task.dueDate && task.dueDate < today ? `Határidő: ${task.dueDate}` : task.status === "in_progress" ? "Folyamatban" : "Teendő",
      taskId: task.id,
    }));
  timeline.filter((item) => item.type === "journal" && item.category === "problem").slice(0, 4).forEach((item) => {
    attentionItems.push({ kind: "blocker", title: item.taskTitle ?? "Napi bejegyzés", detail: item.content ?? "Probléma / akadály rögzítve", journalId: item.id });
  });
  return {
    totalTasks: plan.tasks.length,
    todoTasks: plan.tasks.filter((task) => task.status === "todo").length,
    inProgressTasks: plan.tasks.filter((task) => task.status === "in_progress").length,
    completedTasks,
    progress: plan.tasks.length ? Math.round((completedTasks / plan.tasks.length) * 100) : null,
    recentActivity: [...timeline].sort((first, second) => `${second.date}|${second.recordedAt}|${second.id}`.localeCompare(`${first.date}|${first.recordedAt}|${first.id}`)).slice(0, 6),
    recentPhotos: plan.photos.slice(0, 6),
    attentionItems: attentionItems.slice(0, 8),
    nextTask,
  };
}
