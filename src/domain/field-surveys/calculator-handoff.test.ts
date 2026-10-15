import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { executeCalculator } from "@/domain/calculations/engine";
import { gutterMaterialCalculator } from "@/domain/calculations/gutter-material";
import { mapFieldSurveyToCalculator } from "./calculator-handoff";
import type { FieldSurveyMeasurement } from "./contracts";

const source = { surveyId: "123e4567-e89b-42d3-a456-426614174010", revisionId: "123e4567-e89b-42d3-a456-426614174011", version: 4 };
const measurement = (id: number, semanticType: FieldSurveyMeasurement["semanticType"], value: number, unit: FieldSurveyMeasurement["unit"], label = "Nem szemantikai címke") => ({ id: `123e4567-e89b-42d3-a456-4266141740${String(id).padStart(2, "0")}`, semanticType, label, value, unit }) as FieldSurveyMeasurement;

describe("field survey calculator handoff", () => {
  it("maps typed gutter measurements by semantic type, preserving source and units", () => {
    const result = mapFieldSurveyToCalculator({ ...source, workType: "gutter", measurements: [
      measurement(12, "gutter_run_length", 8.5, "m"), measurement(13, "gutter_stock_length", 3000, "mm"), measurement(14, "gutter_bracket_spacing", 1, "m"),
    ] });
    expect(result).toMatchObject({ ok: true, calculator: "gutter", source, missing: [] });
    if (!result.ok || result.calculator !== "gutter") throw new Error("Expected gutter handoff");
    expect(result.input.runs[0]).toMatchObject({ lengthMm: 8500, measurementSource: "site_measurement", bracketSpacingMm: 1000 });
    const calculated = executeCalculator(gutterMaterialCalculator, result.input);
    expect(calculated).toMatchObject({ ok: true, output: { totals: { gutterStockSections: 3 } } });
  });

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

  it("maps flashing lengths by semantic role and keeps missing stock constraints empty", () => {
    const result = mapFieldSurveyToCalculator({ ...source, workType: "flashing", measurements: [
      measurement(27, "flashing_run_length", 5, "m", "Oromszegély"),
      measurement(28, "flashing_overlap", 50, "mm"),
    ] });
    expect(result).toMatchObject({ ok: true, calculator: "flashing", source, missing: ["A kiválasztott kereskedelmi szálhossz"] });
    if (!result.ok || result.calculator !== "flashing") throw new Error("Expected flashing handoff");
    expect(result.input).toMatchObject({ overlapMm: 50, runs: [{ name: "Oromszegély", lengthMm: 5000 }] });
    expect(result.input.sectionLengthMm).toBeUndefined();
  });

  it("rejects ambiguous roof mapping and duplicate singleton gutter parameters", () => {
    const both = mapFieldSurveyToCalculator({ ...source, workType: "roof", measurements: [measurement(22, "roof_rise", 3, "m"), measurement(23, "roof_pitch", 30, "degree")] });
    expect(both).toMatchObject({ ok: false });
    const duplicate = mapFieldSurveyToCalculator({ ...source, workType: "gutter", measurements: [measurement(24, "gutter_stock_length", 3000, "mm"), measurement(25, "gutter_stock_length", 4000, "mm")] });
    expect(duplicate).toMatchObject({ ok: false });
  });

  it("does not invent mappings for other work", () => {
    expect(mapFieldSurveyToCalculator({ ...source, workType: "other", measurements: [measurement(26, "custom", 3, "mm")] })).toMatchObject({ ok: false });
  });
});
