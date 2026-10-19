import { z } from "zod";

export const materialCategories = ["roof_covering", "sheet_metal", "gutter", "flashing", "insulation", "timber", "accessory", "other"] as const;
export const materialPurchasingUnits = ["piece", "linear_meter", "square_meter", "cubic_meter", "liter", "kilogram", "strand", "package"] as const;
export const materialProvenances = ["verified", "user_provided", "estimated", "demo", "missing"] as const;
export const materialPriceKinds = ["net", "gross"] as const;

export type MaterialCategory = (typeof materialCategories)[number];
export type MaterialPurchasingUnit = (typeof materialPurchasingUnits)[number];
export type MaterialProvenance = (typeof materialProvenances)[number];
export type MaterialPriceKind = (typeof materialPriceKinds)[number];

export const materialCategoryLabels: Record<MaterialCategory, string> = {
  roof_covering: "Tetőfedés", sheet_metal: "Lemez", gutter: "Ereszcsatorna", flashing: "Szegély és bádog", insulation: "Szigetelés", timber: "Faanyag", accessory: "Kiegészítő", other: "Egyéb anyag",
};
export const materialPurchasingUnitLabels: Record<MaterialPurchasingUnit, string> = {
  piece: "db", linear_meter: "m", square_meter: "m²", cubic_meter: "m³", liter: "liter", kilogram: "kg", strand: "szál", package: "csomag",
};
export const materialProvenanceLabels: Record<MaterialProvenance, string> = { verified: "Ellenőrzöttnek jelölt", user_provided: "Felhasználó által megadott", estimated: "Becsült", demo: "DEMO", missing: "Hiányzó adat" };
export const materialPriceKindLabels: Record<MaterialPriceKind, string> = { net: "Nettó", gross: "Bruttó" };

const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const optionalUrl = z.string().trim().max(2048).refine((value) => !value || /^https?:\/\//i.test(value), "Érvényes http(s) URL szükséges.").optional().default("");

export const materialManufacturerInputSchema = z.object({ name: z.string().trim().min(1, "A gyártó neve kötelező.").max(200), website: optionalUrl, notes: optionalText(5000) });

export const materialCategoryNameSchema = z.string().trim().min(1, "A kategória neve kötelező.").max(100, "Legfeljebb 100 karakter lehet.");

export const materialProductInputSchema = z.object({
  name: z.string().trim().min(1, "A termék neve kötelező.").max(200),
  categoryId: uuid, manufacturerId: uuid.nullable(), description: optionalText(5000), productCode: optionalText(120),
  dataProvenance: z.enum(materialProvenances), sourceName: optionalText(200), sourceUrl: optionalUrl, sourceDate: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Érvényes dátum szükséges.").optional().default(""), sourceNotes: optionalText(5000),
});

export const materialManagerProductInputSchema = z.object({
  requestId: uuid,
  categoryId: uuid,
  name: z.string().trim().min(1, "A termék neve kötelező.").max(200),
  purchasingUnit: z.enum(materialPurchasingUnits),
  priceAmount: z.string().trim().max(15).optional().default(""),
  priceKind: z.enum(materialPriceKinds).optional(),
  priceEffectiveDate: z.string().trim().optional().default(""),
}).superRefine((input, context) => {
  const raw = input.priceAmount.replace(",", ".");
  if (!raw) {
    if (input.priceKind) context.addIssue({ code: "custom", path: ["priceAmount"], message: "Ártípust csak megadott árhoz válassz." });
    return;
  }
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(raw)) {
    context.addIssue({ code: "custom", path: ["priceAmount"], message: "Adj meg nem negatív, legfeljebb két tizedesjegyű HUF árat." });
  }
  if (!input.priceKind) context.addIssue({ code: "custom", path: ["priceKind"], message: "Válaszd ki, hogy az ár nettó vagy bruttó." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.priceEffectiveDate) || Number.isNaN(Date.parse(input.priceEffectiveDate))) {
    context.addIssue({ code: "custom", path: ["priceEffectiveDate"], message: "Adj meg érvényes dátumot az árhoz." });
  }
});

const optionalNonNegativeNumber = z.number().finite().nonnegative().nullable();
export const materialVariantInputSchema = z.object({
  productId: uuid, name: z.string().trim().min(1, "A variáns neve kötelező.").max(200), sku: optionalText(120), purchasingUnit: z.enum(materialPurchasingUnits),
  nominalWidthMm: optionalNonNegativeNumber, effectiveWidthMm: optionalNonNegativeNumber, thicknessMm: optionalNonNegativeNumber, lengthMm: optionalNonNegativeNumber, packagingQuantity: z.number().finite().positive().nullable(),
  technicalSpecs: z.record(z.string(), z.string()).superRefine((specs, context) => {
    if (specs.profileMaterialSpec !== undefined && (!specs.profileMaterialSpec.trim() || specs.profileMaterialSpec.length > 200)) {
      context.addIssue({ code: "custom", path: ["profileMaterialSpec"], message: "A profilanyag-azonosító 1–200 karakter lehet." });
    }
  }).default({}), dataProvenance: z.enum(materialProvenances), sourceName: optionalText(200), sourceUrl: optionalUrl, sourceDate: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Érvényes dátum szükséges.").optional().default(""), sourceNotes: optionalText(5000),
});

export const materialPriceOptionInputSchema = z.object({
  variantId: uuid, label: z.string().trim().min(1, "A beszállító vagy forrás megnevezése kötelező.").max(60, "Legfeljebb 60 karakter lehet."),
  amount: z.string().trim().regex(/^\d{1,12}(?:[.,]\d{1,2})?$/, "Adj meg nem negatív, legfeljebb két tizedesjegyű HUF árat."),
  priceKind: z.enum(materialPriceKinds, { message: "Válaszd ki, hogy az ár nettó vagy bruttó." }),
  effectiveDate: z.string().trim().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)), "Adj meg érvényes dátumot az árhoz."),
});
export const materialPriceOptionUpdateSchema = z.object({ optionId: uuid, label: z.string().trim().min(1, "A megnevezés kötelező.").max(60, "Legfeljebb 60 karakter lehet.").optional(), status: z.enum(["active", "archived"]).optional() })
  .refine((value) => value.label !== undefined || value.status !== undefined, "Nincs módosítandó adat.");

const priceAmount = z.number().finite().nonnegative().refine((value) => Number(value.toFixed(2)) === value, "Legfeljebb két tizedes szükséges.");
export const materialPriceInputSchema = z.object({ variantId: uuid, optionId: uuid.nullable().default(null), amount: priceAmount, purchasingUnit: z.enum(materialPurchasingUnits), priceKind: z.enum(materialPriceKinds), priceSource: optionalText(200), effectiveDate: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "Érvényes dátum szükséges."), dataProvenance: z.enum(materialProvenances), sourceName: optionalText(200), sourceUrl: optionalUrl, sourceDate: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Érvényes dátum szükséges.").optional().default(""), sourceNotes: optionalText(5000) });

export const materialFilterSchema = z.object({ search: z.string().trim().max(100).default(""), category: z.enum(materialCategories).optional(), categoryId: uuid.optional(), manufacturerId: uuid.optional(), includeArchived: z.boolean().default(false) });

export function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
