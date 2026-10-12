import { z } from "zod";

export const materialCategories = ["roof_covering", "sheet_metal", "gutter", "flashing", "insulation", "timber", "accessory", "other"] as const;
export const materialPurchasingUnits = ["piece", "linear_meter", "square_meter", "cubic_meter", "kilogram", "package"] as const;
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
  piece: "db", linear_meter: "folyóméter", square_meter: "négyzetméter", cubic_meter: "köbméter", kilogram: "kg", package: "csomag",
};
export const materialProvenanceLabels: Record<MaterialProvenance, string> = { verified: "Ellenőrzött", user_provided: "Felhasználó által megadott", estimated: "Becsült", demo: "DEMO", missing: "Hiányzó adat" };
export const materialPriceKindLabels: Record<MaterialPriceKind, string> = { net: "Nettó", gross: "Bruttó" };

const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const optionalUrl = z.string().trim().max(2048).refine((value) => !value || /^https?:\/\//i.test(value), "Érvényes http(s) URL szükséges.").optional().default("");

export const materialManufacturerInputSchema = z.object({ name: z.string().trim().min(1, "A gyártó neve kötelező.").max(200), website: optionalUrl, notes: optionalText(5000) });

export const materialProductInputSchema = z.object({
  name: z.string().trim().min(1, "A termék neve kötelező.").max(200),
  category: z.enum(materialCategories), manufacturerId: uuid.nullable(), description: optionalText(5000), productCode: optionalText(120),
  dataProvenance: z.enum(materialProvenances), sourceName: optionalText(200), sourceUrl: optionalUrl, sourceDate: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Érvényes dátum szükséges.").optional().default(""), sourceNotes: optionalText(5000),
});

const optionalNonNegativeNumber = z.number().finite().nonnegative().nullable();
export const materialVariantInputSchema = z.object({
  productId: uuid, name: z.string().trim().min(1, "A variáns neve kötelező.").max(200), sku: optionalText(120), purchasingUnit: z.enum(materialPurchasingUnits),
  nominalWidthMm: optionalNonNegativeNumber, effectiveWidthMm: optionalNonNegativeNumber, thicknessMm: optionalNonNegativeNumber, lengthMm: optionalNonNegativeNumber, packagingQuantity: z.number().finite().positive().nullable(),
  technicalSpecs: z.record(z.string(), z.string()).default({}), dataProvenance: z.enum(materialProvenances), sourceName: optionalText(200), sourceUrl: optionalUrl, sourceDate: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Érvényes dátum szükséges.").optional().default(""), sourceNotes: optionalText(5000),
});

const priceAmount = z.number().finite().nonnegative().refine((value) => Number(value.toFixed(2)) === value, "Legfeljebb két tizedes szükséges.");
export const materialPriceInputSchema = z.object({ variantId: uuid, amount: priceAmount, purchasingUnit: z.enum(materialPurchasingUnits), priceKind: z.enum(materialPriceKinds), priceSource: optionalText(200), effectiveDate: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "Érvényes dátum szükséges."), dataProvenance: z.enum(materialProvenances), sourceName: optionalText(200), sourceUrl: optionalUrl, sourceDate: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Érvényes dátum szükséges.").optional().default(""), sourceNotes: optionalText(5000) });

export const materialFilterSchema = z.object({ search: z.string().trim().max(100).default(""), category: z.enum(materialCategories).optional(), manufacturerId: uuid.optional(), includeArchived: z.boolean().default(false) });

export function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
