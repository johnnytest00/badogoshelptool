import { describe, expect, it } from "vitest";
import { calculateDetailedGable } from "./detailed-gable";
import { detailedGableInputFromSurveySection } from "./detailed-gable-section";
import type { QuickGableDraft } from "./quick-gable";
import type { SurveySection } from "./workspace";

const d = (semanticType: QuickGableDraft["semanticType"], value: string, unit: QuickGableDraft["unit"] = "m"): QuickGableDraft => ({ id: semanticType, semanticType, unit, value });
const rect = [d("roof_ridge_length", "10,5"), d("roof_eave_a", "10,5"), d("roof_plane_slope_a", "4,2")];

describe("calculateDetailedGable", () => {
  it("rectangular symmetric planes match the quick result and derive verges from the slope length", () => {
    const r = calculateDetailedGable(rect, true);
    expect(r.status).toBe("ok");
    if (r.status === "ok") { expect(r.totalAreaM2).toBeCloseTo(88.2, 9); expect(r.eaveTotalMm).toBe(21000); expect(r.ridgeMm).toBe(10500); expect(r.vergeTotalMm).toBe(16800); }
  });
  it("trapezoid planes use (eave + ridge) / 2 × distance; the verge total stays unknown until the sides are measured", () => {
    const r = calculateDetailedGable([d("roof_ridge_length", "8"), d("roof_eave_a", "10"), d("roof_plane_slope_a", "4"), d("roof_eave_b", "9"), d("roof_plane_slope_b", "3,5")], false);
    expect(r.status === "ok" && r.totalAreaM2).toBeCloseTo(9 * 4 + 8.5 * 3.5, 9);
    expect(r.status === "ok" && r.vergeTotalMm).toBeNull();
  });
  it("accepts measured sides of a trapezoid within the possible range and rejects impossible ones", () => {
    const base = [d("roof_ridge_length", "8"), d("roof_eave_a", "10"), d("roof_plane_slope_a", "4")];
    const ok = calculateDetailedGable([...base, d("roof_verge_a_left", "4,1"), d("roof_verge_a_right", "4,1")], true);
    expect(ok.status === "ok" && ok.vergeTotalMm).toBe(4 * 4100);
    expect(calculateDetailedGable([...base, d("roof_verge_a_left", "3,9"), d("roof_verge_a_right", "4,1")], true).status).toBe("invalid");
    expect(calculateDetailedGable([...base, d("roof_verge_a_left", "6"), d("roof_verge_a_right", "4,1")], true).status).toBe("invalid");
  });
  it("never treats missing values as zero, needs an explicit plane decision and rejects a contradicting B plane", () => {
    expect(calculateDetailedGable([], undefined).status).toBe("empty");
    expect(calculateDetailedGable(rect, undefined).status).toBe("incomplete");
    expect(calculateDetailedGable([d("roof_ridge_length", "10"), d("roof_eave_a", "10")], true).status).toBe("incomplete");
    expect(calculateDetailedGable([...rect, d("roof_plane_slope_b", "3,8")], true).status).toBe("invalid");
    expect(calculateDetailedGable([...rect, d("roof_verge_a_left", "4,5")], true).status).toBe("invalid");
    expect(calculateDetailedGable([d("roof_ridge_length", "10"), d("roof_eave_a", "10", "degree"), d("roof_plane_slope_a", "4")], true).status).toBe("invalid");
  });
  it("records pitch without using it", () => {
    const r = calculateDetailedGable([...rect, d("roof_pitch", "35", "degree")], true);
    expect(r.status === "ok" && r.totalAreaM2).toBeCloseTo(88.2, 9);
  });
});

describe("detailedGableInputFromSurveySection", () => {
  const sec = (over: Partial<SurveySection>, measurements: SurveySection["measurements"]): SurveySection => ({ id: "00000000-0000-4000-8000-000000000001", name: "x", workType: "roof", roofType: "gable", roofMeasurementMode: "detailed", quickPlanesMatch: true, notes: "", photoIds: [], measurements, ...over });
  const m = (n: number, semanticType: SurveySection["measurements"][number]["semanticType"], value: number | null) => ({ id: `00000000-0000-4000-8000-0000000000${10 + n}`, label: "x", value, unit: "m" as const, semanticType });
  const base = [m(1, "roof_ridge_length", 10.5), m(2, "roof_eave_a", 10.5), m(3, "roof_plane_slope_a", 4.2)];
  it("maps a complete section and refuses incomplete, ambiguous, other-mode or unconfirmed ones", () => {
    expect(detailedGableInputFromSurveySection(sec({}, base))?.input).toMatchObject({ ridgeMm: 10500, eaveBMm: 10500, slopeBMm: 4200, vergeAMm: [4200, 4200] });
    expect(detailedGableInputFromSurveySection(sec({}, base))?.output.areas.combinedRoofM2).toBe(88.2);
    expect(detailedGableInputFromSurveySection(sec({}, [...base, m(4, "roof_ridge_length", 10)]))).toBeNull();
    expect(detailedGableInputFromSurveySection(sec({ quickPlanesMatch: undefined }, base))).toBeNull();
    expect(detailedGableInputFromSurveySection(sec({ roofMeasurementMode: "quick" }, base))).toBeNull();
    expect(detailedGableInputFromSurveySection(sec({}, [m(1, "roof_ridge_length", null), m(2, "roof_eave_a", 10), m(3, "roof_plane_slope_a", 4)]))).toBeNull();
  });
});
