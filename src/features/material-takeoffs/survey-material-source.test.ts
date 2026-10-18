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

  it("builds a bounded default list name that names the source version", () => {
    expect(defaultSurveyMaterialListName({ surveyName: "DEMO eresz", surveyVersion: 2 })).toBe("DEMO eresz · V2 anyaglista");
    expect(defaultSurveyMaterialListName({ surveyName: "x".repeat(300), surveyVersion: 1 })).toHaveLength(120);
  });
});
