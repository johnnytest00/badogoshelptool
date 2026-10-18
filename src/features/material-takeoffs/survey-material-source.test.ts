import { describe, expect, it } from "vitest";
import type { FieldSurveyRevisionRecord } from "@/features/field-surveys/field-survey-data";
import { buildSurveyMaterialSource, defaultSurveyMaterialListName } from "./survey-material-source";

const sectionId = "00000000-0000-4000-8000-000000000201";
const measurementId = "00000000-0000-4000-8000-000000000202";
const revision = (overrides: Partial<FieldSurveyRevisionRecord> = {}): FieldSurveyRevisionRecord => ({
  id: "00000000-0000-4000-8000-000000000203", surveyId: "00000000-0000-4000-8000-000000000204",
  organizationId: "00000000-0000-4000-8000-000000000010", projectId: null, version: 2, workType: "gutter",
  measurements: [], notes: null, photosSnapshot: [], createdAt: "2026-10-18T00:00:00.000Z",
  sections: [{ id: sectionId, name: "DEMO eresz", workType: "gutter", notes: "", photoIds: [], measurements: [
    { id: measurementId, label: "DEMO ereszszakasz", value: 12.5, unit: "m", semanticType: "gutter_run_length" },
  ] }],
  ...overrides,
});

describe("buildSurveyMaterialSource", () => {
  it("offers a measured run length with the exact revision as its source", () => {
    const source = buildSurveyMaterialSource({ id: "00000000-0000-4000-8000-000000000204", version: 2 }, revision(), []);
    expect(source).toMatchObject({ surveyRevisionId: "00000000-0000-4000-8000-000000000203", surveyVersion: 2, currentSurveyVersion: 2, stale: false, surveyName: "DEMO eresz" });
    expect(source.suggestions).toHaveLength(1);
    expect(source.suggestions[0]).toMatchObject({ quantity: "12.5", unit: "linear_meter", quantityKind: "measured", sourceRef: { type: "measurement", sectionId, measurementId } });
    expect(source.unavailable).toEqual([]);
  });

  it("flags a revision older than the current survey version as stale", () => {
    const source = buildSurveyMaterialSource({ id: "00000000-0000-4000-8000-000000000204", version: 3 }, revision(), []);
    expect(source.stale).toBe(true);
    expect(source.currentSurveyVersion).toBe(3);
  });

  it("does not invent a quantity for incomplete or roof-only sections", () => {
    const incomplete = revision({ sections: [
      { id: sectionId, name: "DEMO eresz", workType: "gutter", notes: "", photoIds: [], measurements: [{ id: measurementId, label: "DEMO", value: null, unit: "m", semanticType: "gutter_run_length" }] },
      { id: "00000000-0000-4000-8000-000000000205", name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [] },
    ] });
    const source = buildSurveyMaterialSource({ id: "00000000-0000-4000-8000-000000000204", version: 2 }, incomplete, []);
    expect(source.suggestions).toEqual([]);
    expect(source.unavailable).toHaveLength(2);
    expect(source.unavailable.join(" ")).toContain("nem becslünk");
  });

  describe("independent roof geometry (no project, roof model or work log)", () => {
    const roofId = "00000000-0000-4000-8000-000000000206";
    const m = (n: number, semanticType: "roof_building_length" | "roof_building_width" | "roof_rise" | "roof_eave_overhang" | "roof_front_gable_overhang" | "roof_rear_gable_overhang", value: number) => ({ id: `00000000-0000-4000-8000-0000000003${n}`, label: semanticType, value, unit: "mm" as const, semanticType });
    const roofRevision = () => revision({ workType: "roof", sections: [{ id: roofId, name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [
      m(10, "roof_building_length", 10000), m(11, "roof_building_width", 6000), m(12, "roof_rise", 3000),
      m(13, "roof_eave_overhang", 300), m(14, "roof_front_gable_overhang", 200), m(15, "roof_rear_gable_overhang", 200),
    ] }] });
    const survey = { id: "00000000-0000-4000-8000-000000000204", version: 2 };
    const geometry = (overrides = {}) => ({ id: "00000000-0000-4000-8000-000000000207", sectionId: roofId, surveyRevisionId: "00000000-0000-4000-8000-000000000203", combinedRoofM2: 106.66044252673998, ...overrides });

    it("reports a complete roof section without a recorded area as pending, not as an invented quantity", () => {
      const source = buildSurveyMaterialSource(survey, roofRevision(), []);
      expect(source.suggestions).toEqual([]);
      expect(source.geometryPending).toBe(true);
    });

    it("offers the recorded area at six decimals and references the exact geometry source", () => {
      const source = buildSurveyMaterialSource(survey, roofRevision(), [], [geometry()]);
      expect(source.geometryPending).toBe(false);
      expect(source.suggestions).toHaveLength(1);
      expect(source.suggestions[0]).toMatchObject({ quantity: "106.660443", unit: "square_meter", materialCategory: "roof_covering", quantityKind: "calculated",
        sourceRef: { type: "surveyGeometry", sectionId: roofId, geometrySourceId: "00000000-0000-4000-8000-000000000207" } });
    });

    it("ignores a geometry source recorded for another revision or section", () => {
      const other = buildSurveyMaterialSource(survey, roofRevision(), [], [geometry({ surveyRevisionId: "00000000-0000-4000-8000-000000000299" }), geometry({ sectionId: sectionId })]);
      expect(other.suggestions).toEqual([]);
      expect(other.unavailable.join(" ")).toContain("nem becslünk");
    });

    it("never marks incomplete or non-roof sections as pending", () => {
      expect(buildSurveyMaterialSource(survey, revision(), []).geometryPending).toBe(false);
      const incomplete = revision({ sections: [{ id: roofId, name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [m(10, "roof_building_length", 10000)] }] });
      expect(buildSurveyMaterialSource(survey, incomplete, []).geometryPending).toBe(false);
    });
  });

  it("builds a bounded default list name that names the source version", () => {
    expect(defaultSurveyMaterialListName({ surveyName: "DEMO eresz", surveyVersion: 2 })).toBe("DEMO eresz · V2 anyaglista");
    expect(defaultSurveyMaterialListName({ surveyName: "x".repeat(300), surveyVersion: 1 })).toHaveLength(120);
  });
});
