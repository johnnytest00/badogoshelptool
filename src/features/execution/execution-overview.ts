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
};

function isOpen(task: ExecutionTaskRecord) {
  return task.status !== "done";
}

export function buildExecutionOverview(plan: ExecutionPlanRecord, timeline: ExecutionTimelineItem[], today: string): ExecutionOverviewModel {
  const completedTasks = plan.tasks.filter((task) => task.status === "done").length;
  const attentionItems: ExecutionAttentionItem[] = plan.tasks
    .filter(isOpen)
    .map((task) => ({
      kind: task.dueDate && task.dueDate < today ? "overdue_task" as const : "open_task" as const,
      title: task.title,
      detail: task.dueDate && task.dueDate < today ? `Határidő: ${task.dueDate}` : task.status === "in_progress" ? "Folyamatban" : "Teendő",
      taskId: task.id,
    }));
  timeline.filter((item) => item.type === "journal" && item.category === "problem").slice(0, 4).forEach((item) => {
    attentionItems.push({ kind: "blocker", title: item.taskTitle ?? "Munkanapló-bejegyzés", detail: item.content ?? "Probléma / akadály rögzítve", journalId: item.id });
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
  };
}
