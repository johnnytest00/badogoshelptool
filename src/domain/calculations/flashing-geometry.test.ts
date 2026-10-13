import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { mapGableRoofToFlashingSuggestions } from "@/domain/calculations/flashing-geometry";

describe("mapGableRoofToFlashingSuggestions", () => {
  it("maps only the two eaves, ridge and four sloped gable edges with exact source IDs", () => {
    const output = calculateGableRoof({ inputMode: "height", buildingLengthMm: 8000, buildingWidthMm: 6000, eaveOverhangMm: 300, frontGableOverhangMm: 200, rearGableOverhangMm: 200, roofRiseMm: 2500 });
    const suggestions = mapGableRoofToFlashingSuggestions({ roofModelId: "00000000-0000-4000-8000-000000000001", roofModelName: "DEMO nyeregtető", roofModelRevisionId: "00000000-0000-4000-8000-000000000002", calculationId: "00000000-0000-4000-8000-000000000003", calculationRevisionId: "00000000-0000-4000-8000-000000000004" }, output);
    expect(suggestions).toHaveLength(7);
    expect(suggestions.filter((item) => item.category === "eaves").map((item) => item.reference.edgeId)).toEqual(["left-eave", "right-eave"]);
    expect(suggestions.filter((item) => item.category === "ridge").map((item) => item.reference.edgeId)).toEqual(["ridge"]);
    expect(suggestions.filter((item) => item.category === "verge").map((item) => item.reference.edgeId)).toEqual(["left-front-gable", "left-rear-gable", "right-front-gable", "right-rear-gable"]);
    expect(suggestions.every((item) => item.reference.calculationId === "00000000-0000-4000-8000-000000000003" && item.reference.calculationRevisionId === "00000000-0000-4000-8000-000000000004" && item.lengthMm === Math.ceil(item.reference.suggestedLengthMm) && item.reference.lengthOverridden === false)).toBe(true);
    expect(suggestions.find((item) => item.category === "verge")?.reference.suggestedLengthMm).not.toBe(suggestions.find((item) => item.category === "verge")?.lengthMm);
    expect(suggestions.some((item) => item.label.includes("vápa") || item.label.includes("fal"))).toBe(false);
  });
});
