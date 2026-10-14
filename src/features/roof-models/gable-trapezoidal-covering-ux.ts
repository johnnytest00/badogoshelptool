import type { GableRoofInput, GableRoofOutput } from "@/domain/calculations/gable-roof";
import type { GableTrapezoidalCoveringInput, GableTrapezoidalCoveringOutput } from "@/domain/calculations/gable-trapezoidal-covering";
import type { SavedGableCoveringRevision } from "./gable-trapezoidal-covering-data";

export type CoveringOperation = { signature: string; calculationId: string; operationId: string };

export function sameOrNewCoveringOperation(previous: CoveringOperation | null, signature: string, calculationId: string | null, createId: () => string): CoveringOperation {
  return previous?.signature === signature ? previous : { signature, calculationId: calculationId ?? createId(), operationId: createId() };
}

export function coveringRevisionView(revision: SavedGableCoveringRevision) {
  const input = revision.input as { source: { geometryInput: GableRoofInput; roofModelRevisionId?: string }; coveringInput: GableTrapezoidalCoveringInput };
  const output = revision.output as { geometry: GableRoofOutput; covering: GableTrapezoidalCoveringOutput };
  return { geometryInput: input.source.geometryInput, roofModelRevisionId: input.source.roofModelRevisionId ?? null, coveringInput: input.coveringInput, geometry: output.geometry, covering: output.covering };
}
