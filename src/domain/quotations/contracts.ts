import { z } from "zod";

export const quotationLineSchema = z.object({
  type: z.enum(["MATERIAL", "LABOR", "OTHER"]),
  description: z.string().trim().min(1, "A megnevezés kötelező.").max(240),
  quantity: z.string().trim().regex(/^\d+(?:[.,]\d{1,6})?$/, "A mennyiség legfeljebb 6 tizedesjegyű pozitív szám lehet."),
  unit: z.string().trim().min(1).max(40),
  unitPrice: z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/, "Az egységár legfeljebb 2 tizedesjegyű nemnegatív szám lehet."),
  priceClass: z.enum(["net", "gross"]),
  variantId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  categoryId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  priceId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  takeoffItemId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  sourceMaterialItemId: z.string().uuid().or(z.literal("")).nullish().transform((value) => value ?? undefined),
  takeoffSourceItemIds: z.array(z.string().uuid()).max(100).optional().default([]),
  // Standalone only: points at a verified calculation quantity; the server resolves it from the saved revision.
  calculationSourceKey: z.string().regex(/^(?:takeoff\/\d{1,3}\/\d{1,3}|cut\/(?:rafters|battens)\/\d{1,4})$/, "Érvénytelen kalkulációs forrás.").or(z.literal("")).nullish().transform((value) => value || undefined),
  priceProvenance: z.enum(["catalog_snapshot", "takeoff_snapshot", "user_entered", "missing"]).optional(),
  notes: z.string().max(500).nullish().transform((value) => value ?? undefined),
  // Only the ids survive parsing; the server rebuilds the immutable rate snapshot and verified source quantity.
  laborSource: z.object({ rateId: z.string().uuid(), materialListId: z.string().uuid(), materialRevisionId: z.string().uuid(), materialItemId: z.string().uuid() }).nullish().transform((value) => value ?? undefined),
});

export const quotationDraftSchema = z.object({
  name: z.string().trim().min(1, "Az ajánlat neve kötelező.").max(200),
  clientId: z.string().uuid().optional().or(z.literal("")),
  currency: z.literal("HUF"),
  lines: z.array(quotationLineSchema).max(200),
});

// Standalone drafts may carry unpriced material-list rows without inventing a zero price.
export const standaloneQuotationLineSchema = quotationLineSchema.extend({
  unitPrice: z.string().trim().regex(/^$|^\d+(?:[.,]\d{1,2})?$/, "Az egységár legfeljebb 2 tizedesjegyű nemnegatív szám lehet."),
});

export const standaloneQuotationDraftSchema = quotationDraftSchema.extend({
  lines: z.array(standaloneQuotationLineSchema).max(200),
});

export type QuotationLine = z.infer<typeof quotationLineSchema>;
export type QuotationDraft = z.infer<typeof quotationDraftSchema>;
