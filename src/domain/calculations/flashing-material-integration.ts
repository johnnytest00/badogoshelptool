import { z } from "zod";
import type { FlashingMaterialInput, FlashingMaterialOutput, FlashingCategory } from "./flashing-material";
import type { MaterialCategory, MaterialPriceKind, MaterialProvenance, MaterialPurchasingUnit } from "@/domain/materials/contracts";

export const flashingTakeoffMappingSchema = z.object({ candidateId: z.string().trim().min(1).max(200), variantId: z.string().uuid() });
export type FlashingTakeoffMapping = z.infer<typeof flashingTakeoffMappingSchema>;
export type FlashingTakeoffCandidate = Readonly<{
  id: string;
  groupId: string;
  category: FlashingCategory;
  label: string;
  quantity: number;
  unit: "piece" | "linear_meter";
  method: "manual" | "linear";
  measurementSource: string;
  classification: "preliminary" | "manual";
  warning: string;
}>;

export type FlashingCatalogVariant = Readonly<{
  id: string;
  productId: string;
  productName: string;
  productCategory: MaterialCategory;
  productStatus: "active" | "archived";
  manufacturerName: string | null;
  productCode: string | null;
  variantName: string;
  sku: string | null;
  purchasingUnit: MaterialPurchasingUnit;
  lengthMm: number | null;
  nominalWidthMm: number | null;
  effectiveWidthMm: number | null;
  thicknessMm: number | null;
  packagingQuantity: number | null;
  technicalSpecs: Record<string, string>;
  provenance: MaterialProvenance;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
  sourceNotes: string | null;
  latestPrice: Readonly<{
    id: string;
    amount: number;
    currency: string;
    purchasingUnit: MaterialPurchasingUnit;
    priceKind: MaterialPriceKind;
    effectiveDate: string;
    provenance: MaterialProvenance;
    sourceName: string | null;
    sourceUrl: string | null;
  }> | null;
}>;

export type FlashingMappingCheck = Readonly<{
  candidate: FlashingTakeoffCandidate;
  variant: FlashingCatalogVariant | null;
  status: "unmapped" | "compatible" | "incompatible";
  message: string;
}>;

const categoryLabels: Record<FlashingCategory, string> = { verge: "Oromszegély", wall: "Falszegély", eaves: "Ereszszegély", ridge: "Gerincszegély", hip: "Kontyszegély", valley: "Vápalemez", custom: "Egyedi szegélyprofil" };

export function buildFlashingTakeoffCandidates(input: FlashingMaterialInput, output: FlashingMaterialOutput): FlashingTakeoffCandidate[] {
  const candidates: FlashingTakeoffCandidate[] = [];
  for (const result of output.runs) {
    const source = input.runs.find((run) => run.id === result.id);
    if (result.estimatedSectionCount !== null) candidates.push({
      id: `run-piece:${result.id}`, groupId: `run:${result.id}`, category: result.category,
      label: `${result.name} · ${categoryLabels[result.category]} · becsült szál`,
      quantity: result.estimatedSectionCount, unit: "piece", method: "manual",
      measurementSource: `runs.${result.id}.estimatedSectionCount · ${result.planningTargetLengthMm} mm tervezési cél`,
      classification: "preliminary", warning: "Előzetes matematikai szálbecslés; nem végleges rendelési vagy vágási terv.",
    });
    candidates.push({
      id: `run-linear:${result.id}`, groupId: `run:${result.id}`, category: result.category,
      label: `${result.name} · ${categoryLabels[result.category]} · tervezési hossz`,
      quantity: result.planningTargetLengthMm / 1000, unit: "linear_meter", method: "linear",
      measurementSource: `runs.${result.id}.planningTargetLengthMm=${result.planningTargetLengthMm}; mm/1000; tartalék=${result.reserveMm} mm`,
      classification: "preliminary", warning: "Explicit mm→folyóméter tervezési hossz; a tartalék benne van, nem végleges beszerzési mennyiség.",
    });
    if (result.estimatedSectionCount === null && source) {
      candidates[candidates.length - 1] = { ...candidates[candidates.length - 1]!, warning: "A darabszám nem számítható a hiányzó toldási adat miatt; csak a mentett tervezési hossz adható át folyóméterként." };
    }
  }
  for (const component of output.manualComponents) if (component.quantity > 0) candidates.push({
    id: `manual:${component.id}`, groupId: `manual:${component.id}`, category: component.category,
    label: `${component.name} · ${categoryLabels[component.category]} · kézi tartozék`,
    quantity: component.quantity, unit: "piece", method: "manual",
    measurementSource: `manualComponents.${component.id}`, classification: "manual",
    warning: "Kézzel megadott tartozékmennyiség; geometriai ellenőrzés nélkül.",
  });
  return candidates;
}

export function checkFlashingMapping(candidate: FlashingTakeoffCandidate, variant: FlashingCatalogVariant | null): FlashingMappingCheck {
  if (!variant) return { candidate, variant: null, status: "unmapped", message: "Nincs hozzárendelt aktív katalógusváltozat." };
  if (variant.productStatus !== "active") return { candidate, variant, status: "incompatible", message: "A katalógustermék nem aktív." };
  const acceptedCategories: MaterialCategory[] = candidate.id.startsWith("manual:") ? ["flashing", "sheet_metal", "accessory", "other"] : ["flashing", "sheet_metal"];
  if (!acceptedCategories.includes(variant.productCategory)) return { candidate, variant, status: "incompatible", message: `Kategóriaütközés: ehhez a tételhez ${acceptedCategories.join(" / ")} kategóriájú termék választható; név alapján nincs profil-illesztés.` };
  if (variant.purchasingUnit !== candidate.unit) return { candidate, variant, status: "incompatible", message: `Egységütközés: a kiválasztott mennyiség ${candidate.unit}, a változat ${variant.purchasingUnit}. Nincs automatikus átváltás.` };
  return { candidate, variant, status: "compatible", message: "Katalóguskategória és egység egyezik; ez nem igazol gyártói profil- vagy szerelési kompatibilitást." };
}

export function checkFlashingMappings(candidates: readonly FlashingTakeoffCandidate[], mappings: readonly FlashingTakeoffMapping[], variants: readonly FlashingCatalogVariant[]): FlashingMappingCheck[] {
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const mappingMap = new Map(mappings.map((mapping) => [mapping.candidateId, mapping.variantId]));
  return candidates.map((candidate) => checkFlashingMapping(candidate, variantMap.get(mappingMap.get(candidate.id) ?? "") ?? null));
}

export type FlashingDrawingRow = Readonly<{
  id: string; name: string; category: FlashingCategory; y: number; targetMm: number; requiredMm: number; reserveMm: number;
  lengthMm: number; startExtensionMm: number; endExtensionMm: number; nominalLengthMm: number; sectionCount: number | null;
  boundaryMm: readonly number[]; overlapBands: readonly Readonly<{ startMm: number; endMm: number }>[];
  overlapMm: number | null; effectiveAdvanceMm: number | null;
  source: Readonly<{ edgeId: string; roofModelId: string; roofModelRevisionId: string; calculationId: string; calculationRevisionId: string }> | null;
}>;

export type FlashingDrawingModel = Readonly<{
  width: number; height: number; xOrigin: number; scale: number; maxTargetMm: number;
  rows: readonly FlashingDrawingRow[]; manualComponents: FlashingMaterialOutput["manualComponents"];
  sourceRevisionId: string; nominalLengthMm: number; connectionMode: FlashingMaterialInput["sectionSpec"]["connection"]["mode"];
}>;

export function buildFlashingDrawingModel(input: FlashingMaterialInput, output: FlashingMaterialOutput, sourceRevisionId: string): FlashingDrawingModel {
  const maxTargetMm = Math.max(1, ...output.runs.map((run) => run.planningTargetLengthMm));
  const xOrigin = 240; const drawingWidth = 660; const scale = drawingWidth / maxTargetMm; const rowGap = 142;
  const connection = input.sectionSpec.connection;
  const rows = output.runs.map((run, index): FlashingDrawingRow => {
    const source = input.runs.find((item) => item.id === run.id)!;
    const boundaries: number[] = []; const overlapBands: { startMm: number; endMm: number }[] = [];
    if (run.estimatedSectionCount !== null && run.estimatedSectionCount > 1) {
      for (let section = 1; section < run.estimatedSectionCount; section++) {
        if (connection.mode === "no_overlap_confirmed") { const next = section * run.nominalSectionLengthMm; boundaries.push(next); }
        else if (connection.mode === "explicit_overlap") {
          const step = run.nominalSectionLengthMm - connection.overlapMm;
          const next = section * step; boundaries.push(next);
          overlapBands.push({ startMm: next, endMm: Math.min(run.planningTargetLengthMm, next + connection.overlapMm) });
        } else if (connection.mode === "effective_length_supplied") {
          const next = run.nominalSectionLengthMm + (section - 1) * connection.additionalCoveragePerSectionMm; boundaries.push(next);
        }
      }
    }
    return {
      id: run.id, name: run.name, category: run.category, y: 100 + index * rowGap,
      targetMm: run.planningTargetLengthMm, requiredMm: run.requiredCoverageLengthMm, reserveMm: run.reserveMm,
      lengthMm: run.lengthMm, startExtensionMm: source.startExtensionMm, endExtensionMm: source.endExtensionMm,
      nominalLengthMm: run.nominalSectionLengthMm, sectionCount: run.estimatedSectionCount,
      boundaryMm: boundaries, overlapBands,
      overlapMm: connection.mode === "explicit_overlap" ? connection.overlapMm : null,
      effectiveAdvanceMm: connection.mode === "effective_length_supplied" ? connection.additionalCoveragePerSectionMm : null,
      source: source.roofEdgeReference ? { edgeId: source.roofEdgeReference.edgeId, roofModelId: source.roofEdgeReference.roofModelId, roofModelRevisionId: source.roofEdgeReference.roofModelRevisionId, calculationId: source.roofEdgeReference.calculationId, calculationRevisionId: source.roofEdgeReference.calculationRevisionId } : null,
    };
  });
  return { width: 960, height: Math.max(280, 170 + rows.length * rowGap + input.manualComponents.length * 58), xOrigin, scale, maxTargetMm, rows, manualComponents: output.manualComponents, sourceRevisionId, nominalLengthMm: input.sectionSpec.nominalLengthMm, connectionMode: connection.mode };
}
