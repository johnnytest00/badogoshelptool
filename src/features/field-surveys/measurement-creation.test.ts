import { describe, expect, it } from "vitest";
import type { SurveyMeasurementDraft } from "./survey-draft-recovery";
import { addMissingMeasurements, appendSurveyMeasurement } from "./measurement-creation";
import { quickShedTemplates } from "@/domain/field-surveys/contracts";
import { surveyRoofFields } from "@/domain/field-surveys/roof-geometry";
import { surveySectionsSchema } from "@/domain/field-surveys/workspace";

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

describe("single-slope mode switching keeps drafts schema-clean", () => {
  let n = 0;
  const id = () => `123e4567-e89b-42d3-a456-4266141740${String(10 + n++).padStart(2, "0")}`;
  const persist = (measurements: readonly SurveyMeasurementDraft[], mode: "quick" | "building") => surveySectionsSchema.safeParse([{
    id: "123e4567-e89b-42d3-a456-426614174099", name: "Tető", workType: "roof", roofType: "shed", roofMeasurementMode: mode, notes: "", photoIds: [],
    measurements: measurements.map((m) => ({ id: m.id, label: m.label, unit: m.unit, semanticType: m.semanticType, value: m.value.trim() === "" ? null : Number(m.value.replace(",", ".")) })),
  }]);
  const quick: SurveyMeasurementDraft[] = quickShedTemplates.map((t, i) => ({ ...t, id: id(), value: i === 0 ? "8,5" : "4,2" }));

  it("Quick → Building → Quick keeps values and persists only approved properties", () => {
    const building = addMissingMeasurements(quick, surveyRoofFields("shed"), id);
    expect(building.slice(0, 2)).toEqual(quick);
    for (const draft of building) expect(Object.keys(draft).sort()).toEqual(["id", "label", "semanticType", "unit", "value"]);
    expect(persist(building, "building").success).toBe(true);
    const back = addMissingMeasurements(building, quickShedTemplates, id);
    expect(back).toEqual(building);
    expect(persist(back, "quick").success).toBe(true);
  });
  it("Building → Quick direction adds the quick fields without a `key` leak", () => {
    const building = surveyRoofFields("shed").map((t, i) => ({ label: t.label, unit: t.unit, semanticType: t.semanticType, id: id(), value: ["8500", "4200", "20"][i] }));
    const toQuick = addMissingMeasurements(building, quickShedTemplates, id);
    expect(toQuick.map((m) => m.value).slice(0, 3)).toEqual(["8500", "4200", "20"]);
    expect(toQuick.every((m) => !("key" in m))).toBe(true);
    expect(persist(toQuick, "quick").success).toBe(true);
  });
  it("the strict schema still rejects a leaked internal property", () => {
    const section = { id: "123e4567-e89b-42d3-a456-426614174099", name: "Tető", workType: "roof", roofType: "shed", roofMeasurementMode: "quick", notes: "", photoIds: [],
      measurements: [{ id: quick[0].id, label: "h", unit: "m", semanticType: "roof_eave_run", value: 8.5, key: "lengthMm" }] };
    expect(surveySectionsSchema.safeParse([section]).success).toBe(false);
  });
  it("appending a roof template (RoofField) does not leak metadata", () => {
    const [field] = surveyRoofFields("shed");
    expect(Object.keys(appendSurveyMeasurement([], field, id)[0]).sort()).toEqual(["id", "label", "semanticType", "unit", "value"]);
  });
});
