import type { FlashingMaterialInput, FlashingMaterialOutput } from "@/domain/calculations/flashing-material";

type SavedDrawing = { revisionId: string; input: FlashingMaterialInput; output: FlashingMaterialOutput } | null;

export function selectFlashingDrawingPreview(
  dirty: boolean,
  saved: SavedDrawing,
  liveInput: FlashingMaterialInput | null,
  liveOutput: FlashingMaterialOutput | null,
) {
  if (dirty || !saved) return { input: liveInput, output: liveOutput, sourceRevisionId: "Nem mentett előnézet" };
  return { input: saved.input, output: saved.output, sourceRevisionId: saved.revisionId };
}
