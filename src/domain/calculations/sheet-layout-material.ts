import { z } from "zod";
import type { MaterialProvenance, MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { metalSheetLayoutInputSchema } from "./metal-sheet-layout";

const optionalPositive = z.number().finite().positive().nullable();
const optionalNonNegative = z.number().finite().nonnegative().nullable();

export const sheetLayoutMaterialCatalogSchema = z.object({
  variantId: z.string().uuid(),
  productName: z.string().min(1),
  variantName: z.string().min(1),
  sku: z.string().nullable(),
  purchasingUnit: z.enum(["piece", "linear_meter", "square_meter", "cubic_meter", "kilogram", "package"]),
  effectiveCoveringWidthMm: optionalPositive,
  nominalSheetWidthMm: optionalPositive,
  minimumSheetLengthMm: optionalPositive,
  maximumSheetLengthMm: optionalPositive,
  endAllowanceMm: optionalNonNegative,
  provenance: z.enum(["verified", "user_provided", "estimated", "demo", "missing"]),
  sourceName: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceDate: z.string().nullable(),
  sourceNotes: z.string().nullable(),
});

export type SheetLayoutMaterialCatalog = z.infer<typeof sheetLayoutMaterialCatalogSchema>;
export type SheetLayoutManualOverrides = Readonly<{
  effectiveCoveringWidthMm?: number;
  nominalSheetWidthMm?: number;
  minimumSheetLengthMm?: number;
  maximumSheetLengthMm?: number;
  endAllowanceMm?: number;
}>;
export type SheetLayoutParameterSource = "catalog" | "user_provided";
export type SheetLayoutMaterialResolution = Readonly<{
  values: Omit<SheetLayoutMaterialCatalog, "effectiveCoveringWidthMm" | "nominalSheetWidthMm" | "minimumSheetLengthMm" | "maximumSheetLengthMm" | "endAllowanceMm"> & {
    effectiveCoveringWidthMm: number;
    nominalSheetWidthMm: number | null;
    minimumSheetLengthMm: number | null;
    maximumSheetLengthMm: number | null;
    endAllowanceMm: number | null;
  };
  parameterSources: Record<keyof SheetLayoutManualOverrides, SheetLayoutParameterSource>;
  catalogSnapshot: SheetLayoutMaterialCatalog;
}>;

export const storedSheetLayoutInputSchema = z.object({
  calculatorInput: metalSheetLayoutInputSchema,
  source: z.object({
    roofRevisionId: z.string().uuid(),
    geometryCalculationRevisionId: z.string().uuid(),
  }),
  material: z.object({
    catalogSnapshot: sheetLayoutMaterialCatalogSchema,
    effectiveValues: z.object({
      effectiveCoveringWidthMm: z.number().positive(),
      nominalSheetWidthMm: optionalPositive,
      minimumSheetLengthMm: optionalPositive,
      maximumSheetLengthMm: optionalPositive,
      endAllowanceMm: optionalNonNegative,
    }),
    parameterSources: z.record(z.string(), z.enum(["catalog", "user_provided"])),
  }),
});

export type StoredSheetLayoutInput = z.infer<typeof storedSheetLayoutInputSchema>;

const technicalNumber = (specs: Record<string, string>, key: string, allowZero = false): number | null => {
  const raw = specs[key]?.trim().replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && (allowZero ? value >= 0 : value > 0) ? value : null;
};

export function mapCatalogVariantToSheetLayout(variant: Readonly<{
  id: string;
  productName: string;
  name: string;
  sku: string | null;
  purchasingUnit: MaterialPurchasingUnit;
  effectiveWidthMm: number | null;
  nominalWidthMm: number | null;
  technicalSpecs: Record<string, string>;
  provenance: MaterialProvenance;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
  sourceNotes: string | null;
}>): SheetLayoutMaterialCatalog {
  return sheetLayoutMaterialCatalogSchema.parse({
    variantId: variant.id,
    productName: variant.productName,
    variantName: variant.name,
    sku: variant.sku,
    purchasingUnit: variant.purchasingUnit,
    effectiveCoveringWidthMm: variant.effectiveWidthMm,
    nominalSheetWidthMm: variant.nominalWidthMm,
    minimumSheetLengthMm: technicalNumber(variant.technicalSpecs, "minimum_sheet_length_mm"),
    maximumSheetLengthMm: technicalNumber(variant.technicalSpecs, "maximum_sheet_length_mm"),
    endAllowanceMm: technicalNumber(variant.technicalSpecs, "end_allowance_mm", true),
    provenance: variant.provenance,
    sourceName: variant.sourceName,
    sourceUrl: variant.sourceUrl,
    sourceDate: variant.sourceDate,
    sourceNotes: variant.sourceNotes,
  });
}

export function resolveSheetLayoutMaterial(catalog: SheetLayoutMaterialCatalog, overrides: SheetLayoutManualOverrides): SheetLayoutMaterialResolution {
  const resolved = sheetLayoutMaterialCatalogSchema.parse(catalog);
  const source = <K extends keyof SheetLayoutManualOverrides>(key: K): SheetLayoutParameterSource => overrides[key] === undefined ? "catalog" : "user_provided";
  const value = <K extends keyof SheetLayoutManualOverrides>(key: K) => overrides[key] === undefined ? resolved[key] : overrides[key];
  const effectiveCoveringWidthMm = value("effectiveCoveringWidthMm");
  if (effectiveCoveringWidthMm === null || effectiveCoveringWidthMm === undefined || effectiveCoveringWidthMm <= 0) {
    throw new Error("A hasznos fedési szélesség hiányzik; add meg felhasználói felülírásként.");
  }
  const values = {
    ...resolved,
    effectiveCoveringWidthMm,
    nominalSheetWidthMm: value("nominalSheetWidthMm") ?? null,
    minimumSheetLengthMm: value("minimumSheetLengthMm") ?? null,
    maximumSheetLengthMm: value("maximumSheetLengthMm") ?? null,
    endAllowanceMm: value("endAllowanceMm") ?? null,
  };
  if (values.minimumSheetLengthMm !== null && values.maximumSheetLengthMm !== null && values.minimumSheetLengthMm > values.maximumSheetLengthMm) {
    throw new Error("A minimális lemezhossz nem lehet nagyobb a maximálisnál.");
  }
  return {
    values,
    parameterSources: {
      effectiveCoveringWidthMm: source("effectiveCoveringWidthMm"),
      nominalSheetWidthMm: source("nominalSheetWidthMm"),
      minimumSheetLengthMm: source("minimumSheetLengthMm"),
      maximumSheetLengthMm: source("maximumSheetLengthMm"),
      endAllowanceMm: source("endAllowanceMm"),
    },
    catalogSnapshot: resolved,
  };
}

export function hasRelevantMaterialSpecificationChanged(snapshot: SheetLayoutMaterialCatalog, current: SheetLayoutMaterialCatalog): boolean {
  const relevant = (value: SheetLayoutMaterialCatalog) => ({
    variantId: value.variantId,
    purchasingUnit: value.purchasingUnit,
    effectiveCoveringWidthMm: value.effectiveCoveringWidthMm,
    nominalSheetWidthMm: value.nominalSheetWidthMm,
    minimumSheetLengthMm: value.minimumSheetLengthMm,
    maximumSheetLengthMm: value.maximumSheetLengthMm,
    endAllowanceMm: value.endAllowanceMm,
    provenance: value.provenance,
    sourceName: value.sourceName,
    sourceUrl: value.sourceUrl,
    sourceDate: value.sourceDate,
  });
  return JSON.stringify(relevant(snapshot)) !== JSON.stringify(relevant(current));
}
