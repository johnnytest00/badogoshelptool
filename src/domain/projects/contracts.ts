import { z } from "zod";

export const projectTypeSchema = z.enum(["roof_renovation", "roof_construction", "gutter_work", "other"]);
export type ProjectType = z.infer<typeof projectTypeSchema>;

export const projectStatusSchema = z.enum(["draft", "in_progress", "quoted", "accepted", "completed", "archived"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const clientInputSchema = z.object({
  name: z.string().trim().min(1, "A név megadása kötelező.").max(200, "A név legfeljebb 200 karakter lehet."),
  email: z.string().trim().email("Adj meg érvényes e-mail-címet.").max(320).optional().or(z.literal("")),
  phone: optionalText(80),
  billingAddress: optionalText(500),
  notes: optionalText(2000),
});
export type ClientInput = z.infer<typeof clientInputSchema>;

export const projectInputSchema = z.object({
  name: z.string().trim().min(1, "A projekt neve kötelező.").max(200, "A projekt neve legfeljebb 200 karakter lehet."),
  projectType: projectTypeSchema,
  description: optionalText(4000),
  location: optionalText(500),
  clientId: z.string().uuid("Érvénytelen ügyfélazonosító.").optional().or(z.literal("")),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: projectStatusSchema.optional(),
  projectType: projectTypeSchema.optional(),
  includeArchived: z.boolean().default(false),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

export const projectTypeLabels: Record<ProjectType, string> = {
  roof_renovation: "Tetőfelújítás",
  roof_construction: "Új tető építése",
  gutter_work: "Ereszcsatorna-munka",
  other: "Egyéb munka",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  draft: "Vázlat",
  in_progress: "Folyamatban",
  quoted: "Ajánlat készült",
  accepted: "Elfogadva",
  completed: "Lezárva",
  archived: "Archiválva",
};
