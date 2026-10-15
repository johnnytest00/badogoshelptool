import { describe, expect, it } from "vitest";
import { gutterInputFromSelectedEaves, mergeSelectedEaves } from "./gutter-handoff";
import { gutterMaterialInputSchema } from "@/domain/calculations/gutter-material";

const source = { roofModelId: "00000000-0000-4000-8000-000000000001", roofModelRevisionId: "00000000-0000-4000-8000-000000000002", calculationId: "00000000-0000-4000-8000-000000000003", calculationRevisionId: "00000000-0000-4000-8000-000000000004" };

describe("selected eave handoff", () => {
  it("retains exact source and individual edge lengths without duplicate counting", () => {
    const left = { ...source, id: "left-eave", label: "DEMO tető · bal eresz", lengthMm: 10_000 };
    const right = { ...source, id: "right-eave", label: "DEMO tető · jobb eresz", lengthMm: 10_000 };
    const input = gutterInputFromSelectedEaves([left, left, right]);
    expect(input.runs).toHaveLength(2);
    expect(input.runs.map((run) => run.lengthMm)).toEqual([10_000, 10_000]);
    expect(input.runs[0].roofEdge).toEqual({ revisionId: source.roofModelRevisionId, edgeId: "left-eave", roofModelId: source.roofModelId, calculationId: source.calculationId, calculationRevisionId: source.calculationRevisionId, suggestedLengthMm: 10_000, lengthOverridden: false });
    expect(input.gutterStockLengthMm).toBe(0);
    expect(input.downpipes).toEqual([]);
  });
  it("adds a newly selected eave to an existing project draft without changing historical lengths", () => {
    const left = { ...source, id: "left-eave", label: "DEMO tető · bal eresz", lengthMm: 11_000 };
    const right = { ...source, id: "right-eave", label: "DEMO tető · jobb eresz", lengthMm: 11_000 };
    const old = gutterInputFromSelectedEaves([{ ...left, lengthMm: 10_000 }]);
    const existing = { ...old, gutterStockLengthMm: 3_000 };
    const merged = mergeSelectedEaves(existing, [left, right, right]);
    expect(merged.runs.map((run) => run.lengthMm)).toEqual([10_000, 11_000]);
    expect(merged.gutterStockLengthMm).toBe(3_000);
    expect(merged.runs[0].roofEdge?.suggestedLengthMm).toBe(10_000);
  });
  it("keeps a long geometric edge ID in the source while producing a bounded run ID", () => {
    const edgeId = `eave:0,0,0:10000,0,0:${"segment".repeat(10)}`;
    const suggestion = { ...source, id: edgeId, label: "DEMO összetett tető eresze", lengthMm: 3000 };
    const input = gutterInputFromSelectedEaves([suggestion]);
    expect(input.runs[0].id.length).toBeLessThanOrEqual(80);
    expect(input.runs[0].roofEdge?.edgeId).toBe(edgeId);
    expect(gutterInputFromSelectedEaves([suggestion]).runs[0].id).toBe(input.runs[0].id);
    expect(gutterMaterialInputSchema.safeParse({ ...input, gutterStockLengthMm: 4000 }).success).toBe(true);
  });
});
