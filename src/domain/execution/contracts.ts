import { z } from "zod";

export const executionTaskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const executionTaskPrioritySchema = z.enum(["low", "normal", "high"]);
export const executionProjectStatusSchema = z.enum(["planned", "active", "paused", "completed", "archived"]);
export const executionJournalCategorySchema = z.enum(["general", "work_done", "problem", "next_step"]);
export const executionPhotoCategorySchema = z.enum(["before", "during", "after", "uncategorized"]);
export const executionPlanSchema = z.object({ title: z.string().trim().min(1, "Adj meg tervnevet.").max(200), description: z.string().trim().max(2000).optional().or(z.literal("")) });
export const executionTaskSchema = z.object({ title: z.string().trim().min(1, "Adj meg feladatnevet.").max(200), description: z.string().trim().max(2000).optional().or(z.literal(""),), status: executionTaskStatusSchema, priority: executionTaskPrioritySchema, dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")), sortOrder: z.coerce.number().int().min(0).max(100000), version: z.coerce.number().int().min(0) });
export const executionProjectDetailsSchema = z.object({
  title: z.string().trim().min(1, "Adj meg projektnevet.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  status: executionProjectStatusSchema,
  clientName: z.string().trim().max(200).optional().or(z.literal("")),
  location: z.string().trim().max(500).optional().or(z.literal("")),
  plannedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  plannedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  version: z.coerce.number().int().min(0),
}).superRefine((value, context) => {
  if (value.plannedStartDate && value.plannedEndDate && value.plannedEndDate < value.plannedStartDate) context.addIssue({ code: "custom", path: ["plannedEndDate"], message: "A tervezett befejezés nem lehet korábbi a kezdésnél." });
});
export type ExecutionTaskStatus = z.infer<typeof executionTaskStatusSchema>;
export type ExecutionTaskPriority = z.infer<typeof executionTaskPrioritySchema>;
export type ExecutionProjectStatus = z.infer<typeof executionProjectStatusSchema>;
export type ExecutionJournalCategory = z.infer<typeof executionJournalCategorySchema>;
export type ExecutionPhotoCategory = z.infer<typeof executionPhotoCategorySchema>;
