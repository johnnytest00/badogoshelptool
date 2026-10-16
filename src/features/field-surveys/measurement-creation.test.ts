import { describe, expect, it } from "vitest";
import type { SurveyMeasurementDraft } from "./survey-draft-recovery";
import { appendSurveyMeasurement } from "./measurement-creation";

const existing: SurveyMeasurementDraft = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  label: "Ereszszakasz",
  unit: "m",
  semanticType: "gutter_run_length",
  value: "8,5",
};

describe("survey measurement creation", () => {
  it("appends exactly one valid, empty measurement and preserves existing values", () => {
    const next = appendSurveyMeasurement([existing], {
      label: "Épület szélessége",
      unit: "mm",
      semanticType: "roof_building_width",
    }, () => "123e4567-e89b-42d3-a456-426614174002");

    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(existing);
    expect(next[1]).toEqual({
      id: "123e4567-e89b-42d3-a456-426614174002",
      label: "Épület szélessége",
      unit: "mm",
      semanticType: "roof_building_width",
      value: "",
    });
  });

  it("rejects a colliding or malformed identifier without changing the source list", () => {
    const duplicateId = () => appendSurveyMeasurement([existing], {
      label: "Másik mérés",
      unit: "mm",
      semanticType: "custom",
    }, () => existing.id);
    const invalidId = () => appendSurveyMeasurement([existing], {
      label: "Másik mérés",
      unit: "mm",
      semanticType: "custom",
    }, () => "not-a-uuid");

    expect(duplicateId).toThrow("unique UUID");
    expect(invalidId).toThrow("unique UUID");
    expect(existing.value).toBe("8,5");
  });
});
