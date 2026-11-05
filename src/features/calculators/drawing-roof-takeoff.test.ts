import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { processPdfDocument } from "@/infrastructure/drawings/pdf-text-extractor";
import { approveDrawingFields, classifyDrawingPlan } from "./drawing-field-transfer";
import { definitions } from "./roof-calculator-definitions";
import { computeConstruction, isSaveableComputation } from "./construction-computation";
import { suggestDrawingValue } from "./drawing-value-suggestion";
import type { RoofMaterialUiState } from "./material-spec-editor";

const manual = (entered: Record<string, number | string> = {}) => ({ mode: "manual" as const, profileId: null, entered });
const syntheticMaterials: RoofMaterialUiState = {
  requested: { timber: true, underlay: false, covering: true },
  layout: { rafterMaxSpacingMm: 900 },
  specs: {
    covering: manual({ nominalWidthMm: 1100, effectiveCoveringWidthMm: 1000, physicalLengthMm: 4100, usableCoveringLengthMm: 4000, manufacturerConstraintReference: "DEMO synthetic sheet specification" }),
    underlay: manual(), rafter: manual({ sectionWidthMm: 80, sectionHeightMm: 200 }), batten: manual(),
  },
};

describe("guided plan to roof material takeoff", () => {
  it("uses manually confirmed dimensions from a synthetic plan in the existing takeoff engine", async () => {
    const bytes = new Uint8Array(await readFile(resolve(process.cwd(), "public/ocr/fixtures/synthetic-simple-roof-plan.pdf")));
    const document = await processPdfDocument(bytes);
    const sources = document.pages.flatMap(({ textSpans }) => textSpans);

    expect(classifyDrawingPlan(sources)).toBe("floor-plan");
    const length = sources.find(({ originalText }) => originalText === "8000 mm")!;
    const width = sources.find(({ originalText }) => originalText === "6000 mm")!;
    const lengthValue = suggestDrawingValue(length.originalText, length.method, "mm");
    const widthValue = suggestDrawingValue(width.originalText, width.method, "mm");
    expect(lengthValue?.value).toBe("8000");
    expect(widthValue?.value).toBe("6000");

    const definition = definitions["roof.material-takeoff"];
    const approved = approveDrawingFields(definition, { roofShape: "gable" }, [
      { fieldKey: "lengthMm", value: lengthValue!.value }, { fieldKey: "widthMm", value: widthValue!.value }, { fieldKey: "pitchDegrees", value: "35" },
    ], new Set());
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const result = computeConstruction(definition, { roofShape: "gable", eaveOverhangMm: "0", ...approved.fields }, syntheticMaterials, []);
    expect(result.completeness.status).toBe("complete");
    expect(isSaveableComputation(result)).toBe(true);
    expect(result.geometry?.totalAreaMm2).toBeCloseTo(58_597_180, 0);
    expect(result.timberLayout?.rafters?.count).toBe(20);
    expect(result.timberLayout?.rafters?.nominalVolumeM3).toBeGreaterThan(0);
    expect(result.materialTakeoff?.parts.find(({ id }) => id === "covering")).toMatchObject({ status: "VALID", quantities: expect.arrayContaining([expect.objectContaining({ label: "Fedőtábla darabszám", value: 16, unit: "db" })]) });
    expect(result.takeoffInputs?.specSnapshot?.groups.covering?.referenceLabel).toBe("DEMO synthetic sheet specification");
  });
});
