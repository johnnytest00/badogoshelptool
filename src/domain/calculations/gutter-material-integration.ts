import { z } from "zod";
import type { GutterMaterialInput, GutterMaterialOutput } from "./gutter-material";
import type { MaterialPurchasingUnit } from "@/domain/materials/contracts";

export const gutterTakeoffMappingSchema = z.object({
  candidateId: z.string().trim().min(1).max(160),
  variantId: z.string().uuid(),
});

export type GutterTakeoffMapping = z.infer<typeof gutterTakeoffMappingSchema>;
export type GutterTakeoffCandidate = Readonly<{
  id: string;
  label: string;
  quantity: number;
  unit: MaterialPurchasingUnit;
  method: "linear" | "manual";
  measurementSource: string;
  classification: "preliminary" | "manual";
}>;

export type GutterCatalogVariant = Readonly<{
  id: string;
  productId: string;
  productName: string;
  category: string;
  variantName: string;
  sku: string | null;
  purchasingUnit: MaterialPurchasingUnit;
  lengthMm: number | null;
  nominalWidthMm: number | null;
  effectiveWidthMm: number | null;
  technicalSpecs: Record<string, string>;
  provenance: string;
}>;

export type GutterMappingCheck = Readonly<{
  candidate: GutterTakeoffCandidate;
  variant: GutterCatalogVariant | null;
  status: "unmapped" | "compatible" | "incompatible";
  message: string;
}>;

export function buildGutterTakeoffCandidates(input: GutterMaterialInput, output: GutterMaterialOutput): GutterTakeoffCandidate[] {
  const candidates: GutterTakeoffCandidate[] = [];
  for (const run of output.gutterRuns) {
    const source = input.runs.find((item) => item.id === run.id);
    candidates.push({
      id: `gutter-section:${run.id}`,
      label: `${run.name} · ereszszál`,
      quantity: run.stockSections,
      unit: "piece",
      method: "linear",
      measurementSource: `gutterRuns.${run.id}.stockSections`,
      classification: "preliminary",
    });
    if (run.bracketEstimate !== null) candidates.push({
      id: `bracket:${run.id}`,
      label: `${run.name} · konzolbecslés`,
      quantity: run.bracketEstimate,
      unit: "piece",
      method: "manual",
      measurementSource: source?.bracketSpacingMm ? `bracketSpacingMm=${source.bracketSpacingMm}` : "gutterRuns.bracketEstimate",
      classification: "manual",
    });
  }
  for (const run of output.downpipeRuns) candidates.push({
    id: `downpipe-section:${run.id}`,
    label: `${run.name} · lefolyószál`,
    quantity: run.stockSections,
    unit: "piece",
    method: "linear",
    measurementSource: `downpipeRuns.${run.id}.stockSections`,
    classification: "preliminary",
  });
  const manual = input.manualComponents.map((component) => ({
    id: `manual:${component.id}`,
    label: component.note ? `${component.category} · ${component.note}` : component.category,
    quantity: component.quantity,
    unit: "piece" as const,
    method: "manual" as const,
    measurementSource: `manualComponents.${component.id}`,
    classification: "manual" as const,
  }));
  return [...candidates, ...manual];
}

export function checkGutterMapping(candidate: GutterTakeoffCandidate, variant: GutterCatalogVariant | null): GutterMappingCheck {
  if (!variant) return { candidate, variant: null, status: "unmapped", message: "Nincs kiválasztott katalógusváltozat." };
  if (variant.purchasingUnit !== candidate.unit) return { candidate, variant, status: "incompatible", message: `Egységütközés: a számítás ${candidate.unit}, a változat ${variant.purchasingUnit}. Nincs automatikus átváltás.` };
  return { candidate, variant, status: "compatible", message: variant.provenance === "verified" ? "Egység kompatibilis; a forrás ellenőrzöttként jelölt." : "Egység kompatibilis; a katalógusforrás nem gyártói igazolás." };
}

export function checkGutterMappings(candidates: readonly GutterTakeoffCandidate[], mappings: readonly GutterTakeoffMapping[], variants: readonly GutterCatalogVariant[]): GutterMappingCheck[] {
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const mappingMap = new Map(mappings.map((mapping) => [mapping.candidateId, mapping.variantId]));
  return candidates.map((candidate) => checkGutterMapping(candidate, variantMap.get(mappingMap.get(candidate.id) ?? "") ?? null));
}

export type GutterDrawingModel = Readonly<{
  sourceRevisionId: string | null;
  width: number;
  height: number;
  runs: readonly Readonly<{
    id: string;
    label: string;
    lengthMm: number;
    y: number;
    width: number;
    sectionBoundaries: readonly number[];
  }>[];
  downpipes: readonly Readonly<{ id: string; label: string; lengthMm: number; commercialLengthMm: number; stockSections: number; selectedBends: number; y: number; width: number; sectionBoundaries: readonly number[] }>[];
  legend: readonly string[];
}>;

export function buildGutterDrawingModel(input: GutterMaterialInput, output: GutterMaterialOutput, sourceRevisionId: string | null): GutterDrawingModel {
  const width = 1000;
  const rowGap = 96;
  const maxLength = Math.max(1, ...output.gutterRuns.map((run) => run.lengthMm));
  const runs = output.gutterRuns.map((run, index) => {
    const y = 80 + index * rowGap;
    const scaledWidth = Math.max(220, 720 * run.lengthMm / maxLength);
    const stock = input.gutterStockLengthMm;
    const boundaries: number[] = [];
    for (let length = stock; length < run.lengthMm; length += stock) boundaries.push(140 + scaledWidth * length / run.lengthMm);
    return { id: run.id, label: run.name, lengthMm: run.lengthMm, y, width: scaledWidth, sectionBoundaries: boundaries };
  });
  const downpipeStart = 80 + output.gutterRuns.length * rowGap + 24;
  const downpipes = output.downpipeRuns.map((run, index) => {
    const source = input.downpipes.find((item) => item.id === run.id);
    const width = Math.max(220, 560 * run.lengthMm / Math.max(1, ...output.downpipeRuns.map((item) => item.lengthMm)));
    const commercialLengthMm = source?.commercialLengthMm ?? run.lengthMm;
    const sectionBoundaries: number[] = [];
    for (let length = commercialLengthMm; length < run.lengthMm; length += commercialLengthMm) sectionBoundaries.push(140 + width * length / run.lengthMm);
    return { id: run.id, label: run.name, lengthMm: run.lengthMm, commercialLengthMm, stockSections: run.stockSections, selectedBends: run.selectedBends, y: downpipeStart + index * 74, width, sectionBoundaries };
  });
  return {
    sourceRevisionId,
    width,
    height: Math.max(260, downpipeStart + Math.max(1, downpipes.length) * 74),
    runs,
    downpipes,
    legend: ["Ereszszakasz", "Kereskedelmi szálhatár", "Független lefolyómenet", "Séma, nem kivitelezési rajz"],
  };
}
