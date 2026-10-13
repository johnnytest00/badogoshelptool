import type { GableRoofOutput } from "@/domain/calculations/gable-roof";

const supportedEdges = [
  { edgeId: "left-eave", outputField: "lengths.eachEaveEdgeMm", category: "eaves" as const, label: "bal eresz" },
  { edgeId: "right-eave", outputField: "lengths.eachEaveEdgeMm", category: "eaves" as const, label: "jobb eresz" },
  { edgeId: "ridge", outputField: "lengths.ridgeLineMm", category: "ridge" as const, label: "gerinc" },
  { edgeId: "left-front-gable", outputField: "lengths.eachSlopingGableEdgeMm", category: "verge" as const, label: "bal első ferde oromél" },
  { edgeId: "left-rear-gable", outputField: "lengths.eachSlopingGableEdgeMm", category: "verge" as const, label: "bal hátsó ferde oromél" },
  { edgeId: "right-front-gable", outputField: "lengths.eachSlopingGableEdgeMm", category: "verge" as const, label: "jobb első ferde oromél" },
  { edgeId: "right-rear-gable", outputField: "lengths.eachSlopingGableEdgeMm", category: "verge" as const, label: "jobb hátsó ferde oromél" },
] as const;

export type FlashingGeometrySource = { roofModelId: string; roofModelName: string; roofModelRevisionId: string; calculationId: string; calculationRevisionId: string };
export type MappedFlashingGeometrySuggestion = { id: string; label: string; category: "verge" | "eaves" | "ridge"; lengthMm: number; reference: { roofModelId: string; roofModelRevisionId: string; calculationId: string; calculationRevisionId: string; edgeId: string; outputField: string; suggestedLengthMm: number; lengthOverridden: boolean } };

export function mapGableRoofToFlashingSuggestions(source: FlashingGeometrySource, output: GableRoofOutput): MappedFlashingGeometrySuggestion[] {
  return supportedEdges.flatMap((edge) => {
    const lengthMm = output.lengths[edge.outputField.slice("lengths.".length) as keyof GableRoofOutput["lengths"]];
    if (!Number.isFinite(lengthMm) || lengthMm <= 0 || lengthMm > Number.MAX_SAFE_INTEGER) return [];
    const wholeMillimeterLength = Math.ceil(lengthMm);
    return [{
      id: `${source.roofModelId}:${edge.edgeId}`,
      label: `${source.roofModelName} · ${edge.label}`,
      category: edge.category,
      lengthMm: wholeMillimeterLength,
      reference: { roofModelId: source.roofModelId, roofModelRevisionId: source.roofModelRevisionId, calculationId: source.calculationId, calculationRevisionId: source.calculationRevisionId, edgeId: edge.edgeId, outputField: edge.outputField, suggestedLengthMm: lengthMm, lengthOverridden: false },
    }];
  });
}
