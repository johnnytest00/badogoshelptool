import { z } from "zod";

export const executionTaskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const executionTaskPrioritySchema = z.enum(["low", "normal", "high"]);
export const executionPlanSchema = z.object({ title: z.string().trim().min(1, "Adj meg tervnevet.").max(200), description: z.string().trim().max(2000).optional().or(z.literal("")) });
export const executionTaskSchema = z.object({ title: z.string().trim().min(1, "Adj meg feladatnevet.").max(200), description: z.string().trim().max(2000).optional().or(z.literal(""),), status: executionTaskStatusSchema, priority: executionTaskPrioritySchema, dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")), sortOrder: z.coerce.number().int().min(0).max(100000), version: z.coerce.number().int().min(0) });
export type ExecutionTaskStatus = z.infer<typeof executionTaskStatusSchema>;
export type ExecutionTaskPriority = z.infer<typeof executionTaskPrioritySchema>;
