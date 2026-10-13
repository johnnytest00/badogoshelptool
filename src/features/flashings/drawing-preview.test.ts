import { describe, expect, it } from "vitest";
import { calculateFlashingMaterial, type FlashingMaterialInput } from "@/domain/calculations/flashing-material";
import { selectFlashingDrawingPreview } from "./drawing-preview";

const provenance = { kind: "demo" as const, label: "DEMO rajzteszt", sourceUrl: null, sourceDate: null, catalogVariantId: null, manuallyOverridden: false };
const input: FlashingMaterialInput = {
  sectionSpec: { nominalLengthMm: 2000, nominalLengthSource: provenance, connection: { mode: "no_overlap_confirmed", source: provenance } },
  runs: [{ id: "run-1", category: "verge", name: "DEMO él", lengthMm: 2000, lengthSource: "demo", roofEdgeReference: null, startExtensionMm: 0, endExtensionMm: 0, reserveMm: 0, installationNotes: [] }],
  manualComponents: [],
};

describe("szegélyrajz forrásválasztása", () => {
  it("a kiválasztott mentett változatot mutatja változatlan szerkesztésnél", () => {
    const output = calculateFlashingMaterial(input);
    const saved = { revisionId: "revision-1", input, output };
    expect(selectFlashingDrawingPreview(false, saved, null, null)).toEqual({ input, output, sourceRevisionId: "revision-1" });
  });

  it("szerkesztéskor az élő eredményt mutatja, hibás bemenetnél elrejti a régi rajzot", () => {
    const saved = { revisionId: "revision-1", input, output: calculateFlashingMaterial(input) };
    const changed = { ...input, runs: [{ ...input.runs[0], lengthMm: 2500 }] };
    const live = calculateFlashingMaterial(changed);
    expect(selectFlashingDrawingPreview(true, saved, changed, live)).toEqual({ input: changed, output: live, sourceRevisionId: "Nem mentett előnézet" });
    expect(selectFlashingDrawingPreview(true, saved, null, null)).toEqual({ input: null, output: null, sourceRevisionId: "Nem mentett előnézet" });
  });
});
