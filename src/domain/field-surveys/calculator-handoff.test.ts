import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { mapFieldSurveyToCalculator } from "./calculator-handoff";
import type { FieldSurveyMeasurement } from "./contracts";

const source = { surveyId: "123e4567-e89b-42d3-a456-426614174010", revisionId: "123e4567-e89b-42d3-a456-426614174011", version: 4 };
const measurement = (id: number, semanticType: FieldSurveyMeasurement["semanticType"], value: number, unit: FieldSurveyMeasurement["unit"], label = "Nem szemantikai címke") => ({ id: `123e4567-e89b-42d3-a456-4266141740${String(id).padStart(2, "0")}`, semanticType, label, value, unit }) as FieldSurveyMeasurement;

describe("field survey calculator handoff", () => {
  it("maps full gable geometry only from explicit semantic measurements and runs the existing engine", () => {
    const result = mapFieldSurveyToCalculator({ ...source, workType: "roof", measurements: [
      measurement(15, "roof_building_length", 10, "m"), measurement(16, "roof_building_width", 8, "m"),
      measurement(17, "roof_rise", 3, "m"), measurement(18, "roof_eave_overhang", 0, "mm"),
      measurement(19, "roof_front_gable_overhang", 0, "mm"), measurement(20, "roof_rear_gable_overhang", 0, "mm"),
    ] });
    expect(result).toMatchObject({ ok: true, calculator: "roof", source, missing: [] });
    if (!result.ok || result.calculator !== "roof") throw new Error("Expected roof handoff");
    expect(calculateGableRoof({ inputMode: "height", buildingLengthMm: Number(result.input.buildingLengthMm), buildingWidthMm: Number(result.input.buildingWidthMm), roofRiseMm: Number(result.input.roofRiseMm), eaveOverhangMm: Number(result.input.eaveOverhangMm), frontGableOverhangMm: Number(result.input.frontGableOverhangMm), rearGableOverhangMm: Number(result.input.rearGableOverhangMm) }).areas.combinedRoofM2).toBeCloseTo(100);
  });

  it("prefills incomplete roof inputs without supplying missing dimensions", () => {
    const result = mapFieldSurveyToCalculator({ ...source, workType: "roof", measurements: [measurement(21, "roof_building_length", 10, "m")] });
    expect(result).toMatchObject({ ok: true, calculator: "roof", missing: ["Épület szélessége", "Tetőemelkedés", "Eresztúlnyúlás", "Első oromtúlnyúlás", "Hátsó oromtúlnyúlás"] });
  });

  it("rejects ambiguous roof mapping and no longer hands legacy gutter/flashing sections to a calculator", () => {
    const both = mapFieldSurveyToCalculator({ ...source, workType: "roof", measurements: [measurement(22, "roof_rise", 3, "m"), measurement(23, "roof_pitch", 30, "degree")] });
    expect(both).toMatchObject({ ok: false });
    for (const workType of ["gutter", "flashing"] as const) expect(mapFieldSurveyToCalculator({ ...source, workType, measurements: [measurement(24, "gutter_run_length", 3, "m")] })).toMatchObject({ ok: false });
  });

  it("does not invent mappings for other work", () => {
    expect(mapFieldSurveyToCalculator({ ...source, workType: "other", measurements: [measurement(26, "custom", 3, "mm")] })).toMatchObject({ ok: false });
  });
});
