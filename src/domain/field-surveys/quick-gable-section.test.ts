import { describe, expect, it } from "vitest";
import { quickGableInputFromSurveySection, quickGableSourceOutput } from "./quick-gable-section";
import type { SurveySection } from "./workspace";

const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const section = (over: Partial<SurveySection>, measurements: SurveySection["measurements"]): SurveySection => ({ id: id(1), name: "DEMO", workType: "roof", roofType: "gable", roofMeasurementMode: "quick", notes: "", photoIds: [], measurements, ...over });
const m = (n: number, semanticType: SurveySection["measurements"][number]["semanticType"], value: number | null, unit: "m" | "mm" = "m") => ({ id: id(n), label: "x", value, unit, semanticType });

describe("quickGableInputFromSurveySection", () => {
  const base = [m(2, "roof_eave_run", 10.5), m(3, "roof_plane_slope_a", 4.2)];
  it("maps equal planes and recomputes the area exactly", () => {
    const input = quickGableInputFromSurveySection(section({ quickPlanesMatch: true }, base));
    expect(input).toEqual({ mode: "quick", eaveRunMm: 10500, slopeAMm: 4200, slopeBMm: 4200, planesMatch: true });
    expect(quickGableSourceOutput(input!).areas.combinedRoofM2).toBe(88.2);
  });
  it("maps unequal planes", () => {
    const input = quickGableInputFromSurveySection(section({ quickPlanesMatch: false }, [m(2, "roof_eave_run", 9000, "mm"), m(3, "roof_plane_slope_a", 4), m(4, "roof_plane_slope_b", 3.5)]));
    expect(quickGableSourceOutput(input!).areas.combinedRoofM2).toBe(67.5);
  });
  it("never publishes incomplete, unconfirmed, contradictory, ambiguous, inactive or non-gable sections", () => {
    expect(quickGableInputFromSurveySection(section({}, base))).toBeNull();
    expect(quickGableInputFromSurveySection(section({ quickPlanesMatch: false }, base))).toBeNull();
    expect(quickGableInputFromSurveySection(section({ quickPlanesMatch: true }, [...base, m(4, "roof_plane_slope_b", 3.8)]))).toBeNull();
    expect(quickGableInputFromSurveySection(section({ quickPlanesMatch: true }, [...base, m(5, "roof_eave_run", 9)]))).toBeNull();
    expect(quickGableInputFromSurveySection(section({ quickPlanesMatch: true, roofMeasurementMode: "building" }, base))).toBeNull();
    expect(quickGableInputFromSurveySection(section({ quickPlanesMatch: true, roofType: "hip", roofMeasurementMode: undefined }, base))).toBeNull();
    expect(quickGableInputFromSurveySection(section({ quickPlanesMatch: true }, [m(2, "roof_eave_run", null), m(3, "roof_plane_slope_a", 4.2)]))).toBeNull();
  });
});
