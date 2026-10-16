import { z } from "zod";

export const quotationLineSchema = z.object({
  type: z.enum(["MATERIAL", "LABOR", "OTHER"]),
  description: z.string().trim().min(1, "A megnevezés kötelező.").max(240),
  quantity: z.string().trim().regex(/^\d+(?:[.,]\d{1,6})?$/, "A mennyiség legfeljebb 6 tizedesjegyű pozitív szám lehet."),
  unit: z.string().trim().min(1).max(40),
  unitPrice: z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/, "Az egységár legfeljebb 2 tizedesjegyű nemnegatív szám lehet."),
  priceClass: z.enum(["net", "gross"]),
  variantId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  priceId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  takeoffItemId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  sourceMaterialItemId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  takeoffSourceItemIds: z.array(z.string().uuid()).max(100).optional().default([]),
  priceProvenance: z.enum(["catalog_snapshot", "takeoff_snapshot", "user_entered", "missing"]).optional(),
  notes: z.string().max(500).nullish().transform((value) => value ?? undefined),
});

export const quotationDraftSchema = z.object({
  name: z.string().trim().min(1, "Az ajánlat neve kötelező.").max(200),
  clientId: z.string().uuid().optional().or(z.literal("")),
  currency: z.literal("HUF"),
  lines: z.array(quotationLineSchema).max(200),
});

export type QuotationLine = z.infer<typeof quotationLineSchema>;
export type QuotationDraft = z.infer<typeof quotationDraftSchema>;
