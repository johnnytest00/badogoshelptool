import { describe, expect, it } from "vitest";
import { gutterInputFromSelectedEaves, mergeSelectedEaves } from "./gutter-handoff";

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
});
