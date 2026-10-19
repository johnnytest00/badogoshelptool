import { describe, expect, it } from "vitest";
import { calculateQuickGable, type QuickGableDraft } from "./quick-gable";

const d = (semanticType: QuickGableDraft["semanticType"], value: string, unit: QuickGableDraft["unit"] = "m"): QuickGableDraft => ({ id: semanticType, semanticType, unit, value });

describe("calculateQuickGable", () => {
  it("computes a symmetric roof from directly measured values with decimal comma", () => {
    const r = calculateQuickGable([d("roof_eave_run", "10,5"), d("roof_plane_slope_a", "4,2"), d("roof_plane_slope_b", "")], true);
    expect(r.status).toBe("ok");
    if (r.status === "ok") { expect(r.totalAreaM2).toBeCloseTo(88.2, 9); expect(r.ridgeMm).toBe(10500); expect(r.eaveTotalMm).toBe(21000); expect(r.vergeTotalMm).toBe(16800); }
  });
  it("supports different planes and mixed mm/m units", () => {
    const r = calculateQuickGable([d("roof_eave_run", "9000", "mm"), d("roof_plane_slope_a", "4"), d("roof_plane_slope_b", "3,5")], false);
    expect(r.status === "ok" && r.totalAreaM2).toBeCloseTo(67.5, 9);
  });
  it("never treats empty as zero and requires explicit plane confirmation", () => {
    expect(calculateQuickGable([d("roof_eave_run", ""), d("roof_plane_slope_a", "4")], true)).toMatchObject({ status: "incomplete" });
    expect(calculateQuickGable([d("roof_eave_run", "10"), d("roof_plane_slope_a", "4")], undefined)).toMatchObject({ status: "incomplete" });
    expect(calculateQuickGable([d("roof_eave_run", "10"), d("roof_plane_slope_a", "4"), d("roof_plane_slope_b", "")], false)).toMatchObject({ status: "incomplete" });
  });
  it("rejects zero, negative, non-numeric, sub-millimetre and oversized values", () => {
    for (const bad of ["0", "-3", "abc", "4,1234", "250"]) expect(calculateQuickGable([d("roof_eave_run", "10"), d("roof_plane_slope_a", bad)], true).status).toBe("invalid");
    expect(calculateQuickGable([d("roof_eave_run", "10"), { ...d("roof_plane_slope_a", "4"), unit: "degree" }], true).status).toBe("invalid");
  });
  it("flags a B plane that contradicts the 'planes match' confirmation", () => {
    expect(calculateQuickGable([d("roof_eave_run", "10"), d("roof_plane_slope_a", "4"), d("roof_plane_slope_b", "3,8")], true)).toMatchObject({ status: "invalid" });
  });
  it("accepts float-unsafe metre inputs such as 4,123", () => {
    expect(calculateQuickGable([d("roof_eave_run", "10"), d("roof_plane_slope_a", "4,123")], true).status).toBe("ok");
  });
});
