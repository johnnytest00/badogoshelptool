import { describe, expect, it } from "vitest";
import { calculateQuickShed } from "./quick-shed";
import { quickShedInputFromSurveySection, quickShedSourceOutput } from "./quick-shed-section";
import { multiRoofGeometryFromSurveySection } from "./multi-roof-section-geometry";
import type { SurveySection } from "./workspace";

const d = (semanticType: "roof_eave_run" | "roof_plane_slope_a", value: string, unit: "m" | "mm" = "m") => ({ id: semanticType, semanticType, unit, value });
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const section = (mode: "quick" | "building", eave: number | null, slope: number | null, roofType: "shed" | "gable" = "shed"): SurveySection => ({
  id: id(1), name: "Tető", workType: "roof", roofType, roofMeasurementMode: mode, notes: "", photoIds: [],
  measurements: [
    { id: id(2), label: "Eresz", value: eave, unit: "m", semanticType: "roof_eave_run" },
    { id: id(3), label: "Lejtő", value: slope, unit: "m", semanticType: "roof_plane_slope_a" },
  ],
});

describe("calculateQuickShed", () => {
  it("computes the rectangle area with decimal comma and mm", () => {
    const r = calculateQuickShed([d("roof_eave_run", "8,5"), d("roof_plane_slope_a", "4200", "mm")]);
    expect(r).toMatchObject({ status: "ok", areaM2: 35.7, rakeTotalMm: 8400 });
  });
  it("never treats empty as zero", () => {
    expect(calculateQuickShed([d("roof_eave_run", ""), d("roof_plane_slope_a", "")]).status).toBe("incomplete");
    const r = calculateQuickShed([d("roof_eave_run", "8"), d("roof_plane_slope_a", "")]);
    expect(r).toMatchObject({ status: "incomplete", message: expect.stringContaining("lejtő menti") });
  });
  it("rejects zero, negative, sub-mm and oversize values", () => {
    for (const value of ["0", "-1", "abc", "300"]) expect(calculateQuickShed([d("roof_eave_run", value), d("roof_plane_slope_a", "4")]).status).toBe("invalid");
    expect(calculateQuickShed([d("roof_eave_run", "8,0004"), d("roof_plane_slope_a", "4")]).status).toBe("invalid");
  });
});

describe("quick shed source", () => {
  it("builds the verified source only from a complete quick shed section", () => {
    const input = quickShedInputFromSurveySection(section("quick", 8.5, 4.2));
    expect(input).toEqual({ mode: "quick", eaveRunMm: 8500, slopeMm: 4200 });
    expect(quickShedSourceOutput(input!).areas.combinedRoofM2).toBe(35.7);
  });
  it("publishes nothing for incomplete, gable or building-mode sections", () => {
    expect(quickShedInputFromSurveySection(section("quick", 8.5, null))).toBeNull();
    expect(quickShedInputFromSurveySection(section("building", 8.5, 4.2))).toBeNull();
    expect(quickShedInputFromSurveySection(section("quick", 8.5, 4.2, "gable"))).toBeNull();
  });
  it("hides retained building values while in quick mode (no mixed publication)", () => {
    const withBuilding: SurveySection = { ...section("quick", 8.5, 4.2), measurements: [...section("quick", 8.5, 4.2).measurements,
      { id: id(4), label: "H", value: 8.5, unit: "m", semanticType: "roof_outer_length" }, { id: id(5), label: "Sz", value: 4, unit: "m", semanticType: "roof_outer_width" }, { id: id(6), label: "P", value: 20, unit: "degree", semanticType: "roof_pitch" }] };
    expect(multiRoofGeometryFromSurveySection(withBuilding)).toBeNull();
    expect(multiRoofGeometryFromSurveySection({ ...withBuilding, roofMeasurementMode: "building" })).toMatchObject({ type: "shed", lengthMm: 8500 });
  });
});
